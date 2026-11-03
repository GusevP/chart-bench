import { summarize } from 'bench-stage/stats';

import type { DataMessage, ResultMessage } from '../EmbeddedArmPage';
import { nudge } from './parse';
import type { Parsed } from './parse';

export type Summary = ReturnType<typeof summarize>;
export type LibraryResult = {
  mount: Summary;
  update: Summary;
  blocking: Summary | null;
  domNodes: number;
};
export type Measurements = { floor: LibraryResult; results: Record<string, LibraryResult> };

export const RUNS = 5;
export const WARMUP = 1;
const TIMEOUT_MS = 60_000;

// chartjs fires its settle signal once per page, so updates are timed on rAF instead.
const RAF_UPDATE = new Set(['chartjs']);

type LoafEntry = PerformanceEntry & { blockingDuration: number };
// Chrome exposes long-animation-frame only to the top-level window, so the playground observes it, not the lab frame.
const supportsLoaf = PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame') ?? false;
const loafFrames: LoafEntry[] = [];
const loafObserver = new PerformanceObserver(list => loafFrames.push(...(list.getEntries() as LoafEntry[])));
if (supportsLoaf) loafObserver.observe({ type: 'long-animation-frame', buffered: true });

async function blockingBetween(startAt: number, endAt: number, signal: AbortSignal): Promise<number | null> {
  if (!supportsLoaf) return null;
  await new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const frame = requestAnimationFrame(() => (timer = setTimeout(done, 0)));
    const onAbort = () => done(signal.reason);
    const done = (error?: unknown) => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve();
    };
    signal.addEventListener('abort', onAbort);
    if (signal.aborted) onAbort();
  });
  loafFrames.push(...(loafObserver.takeRecords() as LoafEntry[]));
  return loafFrames
    .filter(f => {
      const from = performance.timeOrigin + f.startTime;
      return from < endAt && from + f.duration > startAt;
    })
    .reduce((sum, f) => sum + f.blockingDuration, 0);
}

class HiddenError extends Error {}

type Sample = { mountMs: number; updateMs: number; blockingMs: number | null; domNodes: number };
type Result<M extends 'mount' | 'update'> = Extract<ResultMessage, { type: 'bench:result'; mode: M }>;

let lastRunId = 0;
let floor: LibraryResult | undefined;

const aborted = () => new DOMException('Measurement cancelled', 'AbortError');

function waitFor<T>(
  frame: HTMLIFrameElement,
  signal: AbortSignal,
  runId: number | null,
  pick: (message: ResultMessage) => T | undefined,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Timed out waiting for the chart page.')), TIMEOUT_MS);
    const onMessage = (event: MessageEvent<ResultMessage>) => {
      if (event.origin !== location.origin || event.source !== frame.contentWindow) return;
      const message = event.data;
      if (message.type === 'bench:error' && message.runId === runId)
        return finish(new Error(message.message));
      const hit = pick(message);
      if (hit !== undefined) finish(undefined, hit);
    };
    const onAbort = () => finish(signal.reason);
    const finish = (error?: unknown, value?: T) => {
      clearTimeout(timer);
      window.removeEventListener('message', onMessage);
      signal.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve(value as T);
    };
    window.addEventListener('message', onMessage);
    signal.addEventListener('abort', onAbort);
    if (signal.aborted) onAbort();
  });
}

function untilVisible(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    if (document.visibilityState === 'visible') return resolve();
    const done = (fn: () => void) => {
      document.removeEventListener('visibilitychange', onVisibility);
      signal.removeEventListener('abort', onAbort);
      fn();
    };
    const onVisibility = () => document.visibilityState === 'visible' && done(resolve);
    const onAbort = () => done(() => reject(aborted()));
    document.addEventListener('visibilitychange', onVisibility);
    signal.addEventListener('abort', onAbort);
  });
}

async function runOnce(
  frame: HTMLIFrameElement,
  src: string,
  data: Parsed,
  updated: Parsed,
  library: string,
  signal: AbortSignal,
): Promise<Sample> {
  await untilVisible(signal);
  const run = new AbortController();
  const onVisibility = () => document.visibilityState === 'hidden' && run.abort(new HiddenError());
  const onAbort = () => run.abort(aborted());
  document.addEventListener('visibilitychange', onVisibility);
  signal.addEventListener('abort', onAbort);
  try {
    return await sample(frame, src, data, updated, library, run.signal);
  } finally {
    document.removeEventListener('visibilitychange', onVisibility);
    signal.removeEventListener('abort', onAbort);
  }
}

async function sample(
  frame: HTMLIFrameElement,
  src: string,
  data: Parsed,
  updated: Parsed,
  library: string,
  signal: AbortSignal,
): Promise<Sample> {
  const previous = frame.contentDocument;
  const ready = waitFor(frame, signal, null, m =>
    m.type === 'bench:ready' && frame.contentDocument !== previous ? m.settleMode : undefined,
  );
  frame.contentWindow!.location.replace(src);
  const reported = await ready;
  const updateSettle = RAF_UPDATE.has(library) ? 'raf' : reported;

  const send = <M extends 'mount' | 'update'>(mode: M, payload: Parsed) => {
    const runId = ++lastRunId;
    frame.dataset.runId = String(runId);
    const result = waitFor(frame, signal, runId, m =>
      m.type === 'bench:result' && m.runId === runId && m.mode === mode ? (m as Result<M>) : undefined,
    );
    frame.contentWindow!.postMessage(
      { type: 'bench:data', runId, mode, updateSettle, ...payload } satisfies DataMessage,
      location.origin,
    );
    return result;
  };
  const mount = await send('mount', data);
  const update = await send('update', updated);
  return {
    mountMs: mount.mountMs,
    updateMs: update.updateMs,
    blockingMs: await blockingBetween(mount.startAt, mount.endAt, signal),
    domNodes: mount.domNodes,
  };
}

export type Options = { runs?: number; warmup?: number; query?: URLSearchParams; signal: AbortSignal };

export async function measureLibrary(
  frame: HTMLIFrameElement,
  library: string,
  data: Parsed,
  { runs = RUNS, warmup = WARMUP, query = new URLSearchParams(), signal }: Options,
): Promise<LibraryResult> {
  const params = new URLSearchParams(query);
  params.set('embed', 'lab');
  const src = `${library}.html?${params}`;
  const updated = nudge(data);

  const samples: Sample[] = [];
  while (samples.length < warmup + runs) {
    try {
      samples.push(await runOnce(frame, src, data, updated, library, signal));
    } catch (e) {
      if (!(e instanceof HiddenError)) throw e;
    }
  }
  const kept = samples.slice(warmup);
  const blocking = kept.map(s => s.blockingMs);
  return {
    mount: summarize(kept.map(s => s.mountMs)),
    update: summarize(kept.map(s => s.updateMs)),
    blocking: blocking.every(b => b !== null) ? summarize(blocking) : null,
    domNodes: kept[kept.length - 1]!.domNodes,
  };
}

export async function measureAll(
  frame: HTMLIFrameElement,
  libraries: string[],
  data: Parsed,
  options: Omit<Options, 'runs' | 'warmup'> & {
    onProgress: (done: number, total: number, library: string) => void;
  },
): Promise<Measurements> {
  const { onProgress, ...rest } = options;
  const total = libraries.length + (floor ? 0 : 1);
  let done = 0;
  if (!floor) {
    onProgress(done++, total, 'shell');
    floor = await measureLibrary(frame, 'shell', data, rest);
  }
  const results: Record<string, LibraryResult> = {};
  for (const library of libraries) {
    onProgress(done++, total, library);
    results[library] = await measureLibrary(frame, library, data, rest);
  }
  return { floor, results };
}
