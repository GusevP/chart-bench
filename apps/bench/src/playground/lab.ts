import { summarize } from 'bench-stage/stats';

import type { ChartKind } from '../data/contract';
import type { DataMessage, ResultMessage } from '../EmbeddedArmPage';
import { isGallery, nudge } from './parse';
import type { Parsed } from './parse';

export function frameSrc(library: string, chart: ChartKind, query: URLSearchParams) {
  const params = new URLSearchParams(query);
  if (library === 'shell' || !isGallery(chart)) return `${library}.html?${params}`;
  params.set('lib', library);
  params.set('chart', chart);
  return `gallery.html?${params}`;
}

export type Summary = ReturnType<typeof summarize>;
export type LibraryResult = {
  mount: Summary;
  update: Summary;
  blocking: Summary | null;
  domNodes: number;
  timedOut?: true;
  /** Set when the library was skipped because its run on the `probe` data took this long. */
  probeMs?: number;
};
export type Measurements = { floor: LibraryResult; results: Record<string, LibraryResult> };

export const RUNS = 5;
export const WARMUP = 1;
export const TIMEOUT_MS = 60_000;
// A library whose first run (mount + update) takes longer is measured once, and its card is not redrawn.
export const SLOW_MS = 2_000;

// chartjs fires its settle signal once per page, so updates are timed on rAF instead.
const RAF_UPDATE = new Set(['chartjs']);

class HiddenError extends Error {}
class TimeoutError extends Error {}

const visibility = new EventTarget();
document.addEventListener('visibilitychange', () => visibility.dispatchEvent(new Event('change')));
let inView = true;
const isVisible = () => document.visibilityState === 'visible' && inView;

type Sample = { mountMs: number; updateMs: number; blockingMs: number | null; domNodes: number };
type Result<M extends 'mount' | 'update'> = Extract<ResultMessage, { type: 'bench:result'; mode: M }>;

let lastRunId = 0;
let floor: LibraryResult | undefined;
let isolation: boolean | undefined;

const aborted = () => new DOMException('Measurement cancelled', 'AbortError');

function waitFor<T>(
  frame: HTMLIFrameElement,
  signal: AbortSignal,
  runId: number | null,
  pick: (message: ResultMessage) => T | undefined,
  timeoutMs = TIMEOUT_MS,
) {
  return new Promise<T>((resolve, reject) => {
    const timer = Number.isFinite(timeoutMs)
      ? setTimeout(() => finish(new TimeoutError('Timed out waiting for the chart page.')), timeoutMs)
      : undefined;
    const onMessage = (event: MessageEvent<ResultMessage>) => {
      // The sandboxed frame's messages come from the opaque origin "null", so the source is the check.
      if (event.source !== frame.contentWindow) return;
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
    if (isVisible()) return resolve();
    const done = (fn: () => void) => {
      visibility.removeEventListener('change', onVisibility);
      signal.removeEventListener('abort', onAbort);
      fn();
    };
    const onVisibility = () => isVisible() && done(resolve);
    const onAbort = () => done(() => reject(aborted()));
    visibility.addEventListener('change', onVisibility);
    signal.addEventListener('abort', onAbort);
  });
}

// Without allow-same-origin the frame gets an opaque origin, which Chrome puts in its own process:
// a chart that blocks for minutes no longer freezes this page, so the timeout and Cancel still fire.
function newFrame(stage: HTMLElement, src: string) {
  const frame = document.createElement('iframe');
  frame.sandbox.add('allow-scripts');
  frame.title = 'measurement';
  frame.src = src;
  stage.replaceChildren(frame);
  return frame;
}

const post = (frame: HTMLIFrameElement, message: DataMessage) =>
  frame.contentWindow!.postMessage(message, '*');

/** Whether a busy frame leaves this page's timers running, i.e. the frame has its own process. */
async function isolated(stage: HTMLElement, src: string, signal: AbortSignal) {
  const frame = newFrame(stage, src);
  await waitFor(frame, signal, null, m => (m.type === 'bench:ready' ? true : undefined));
  let maxGap = 0;
  let last = performance.now();
  const timer = setInterval(() => {
    const now = performance.now();
    maxGap = Math.max(maxGap, now - last);
    last = now;
  }, 10);
  try {
    const done = waitFor(frame, signal, null, m => (m.type === 'bench:busy-done' ? true : undefined));
    post(frame, { type: 'bench:busy', ms: 300 });
    await done;
    // One more tick so a stall that ended with the busy loop is counted.
    await new Promise(resolve => setTimeout(resolve, 20));
    return maxGap < 150;
  } finally {
    clearInterval(timer);
  }
}

// Chrome runs every sandboxed frame of this site in one process, and removing a frame does not stop a
// script already running there. A fresh frame answers only once that script ends, so the next library
// waits for it instead of timing out behind it.
async function untilFree(stage: HTMLElement, src: string, signal: AbortSignal) {
  const frame = newFrame(stage, src);
  await waitFor(frame, signal, null, m => (m.type === 'bench:ready' ? true : undefined), Infinity);
}

async function runOnce(
  stage: HTMLElement,
  src: string,
  data: Parsed,
  updated: Parsed,
  library: string,
  signal: AbortSignal,
): Promise<Sample> {
  await untilVisible(signal);
  const run = new AbortController();
  const onVisibility = () => !isVisible() && run.abort(new HiddenError());
  const onAbort = () => run.abort(aborted());
  visibility.addEventListener('change', onVisibility);
  signal.addEventListener('abort', onAbort);
  try {
    return await sample(stage, src, data, updated, library, run.signal);
  } finally {
    visibility.removeEventListener('change', onVisibility);
    signal.removeEventListener('abort', onAbort);
  }
}

async function sample(
  stage: HTMLElement,
  src: string,
  data: Parsed,
  updated: Parsed,
  library: string,
  signal: AbortSignal,
): Promise<Sample> {
  const frame = newFrame(stage, src);
  const reported = await waitFor(frame, signal, null, m =>
    m.type === 'bench:ready' ? m.settleMode : undefined,
  );
  const updateSettle = RAF_UPDATE.has(library) ? 'raf' : reported;

  const send = <M extends 'mount' | 'update'>(mode: M, payload: Parsed) => {
    const runId = ++lastRunId;
    frame.dataset.runId = String(runId);
    const result = waitFor(frame, signal, runId, m =>
      m.type === 'bench:result' && m.runId === runId && m.mode === mode ? (m as Result<M>) : undefined,
    );
    post(frame, { type: 'bench:data', runId, mode, updateSettle, ...payload });
    return result;
  };
  const mount = await send('mount', data);
  const update = await send('update', updated);
  return {
    mountMs: mount.mountMs,
    updateMs: update.updateMs,
    // Out of process the frame sees its own long animation frames; in the page's process it sees none.
    blockingMs: isolation ? mount.blockingMs : null,
    domNodes: mount.domNodes,
  };
}

const NEVER: Summary = { median: Infinity, iqr: 0, n: 0 };
const TIMED_OUT: LibraryResult = {
  mount: NEVER,
  update: NEVER,
  blocking: null,
  domNodes: Number.NaN,
  timedOut: true,
};

export type Options = {
  runs?: number;
  warmup?: number;
  query?: URLSearchParams;
  signal: AbortSignal;
  /** Fail instead of measuring when the frame would share this page's process (data big enough to freeze it). */
  requireIsolation?: boolean;
  /** Smaller data run first; a library slower than SLOW_MS on it is skipped, as the real run would likely time out. */
  probe?: Parsed;
  onRun?: (run: number, total: number) => void;
  /** Called while a timed-out library's script is still running and holding up the next run. */
  onWait?: (library: string) => void;
};

export async function measureLibrary(
  stage: HTMLElement,
  library: string,
  data: Parsed,
  { runs = RUNS, warmup = WARMUP, query = new URLSearchParams(), signal, probe, onRun, onWait }: Options,
): Promise<LibraryResult> {
  const params = new URLSearchParams(query);
  params.set('embed', 'lab');
  const src = frameSrc(library, data.chart, params);
  const updated = nudge(data);
  const timedOut = async () => {
    onWait?.(library);
    await untilFree(stage, frameSrc('shell', data.chart, params), signal);
    return TIMED_OUT;
  };

  if (probe && library !== 'shell') {
    onRun?.(0, warmup + runs);
    try {
      const p = await runOnce(stage, src, probe, nudge(probe), library, signal);
      if (p.mountMs + p.updateMs > SLOW_MS) return { ...TIMED_OUT, probeMs: p.mountMs + p.updateMs };
    } catch (e) {
      if (e instanceof TimeoutError) return timedOut();
      if (!(e instanceof HiddenError)) throw e;
    }
  }

  const samples: Sample[] = [];
  while (samples.length < warmup + runs) {
    onRun?.(samples.length + 1, warmup + runs);
    try {
      const s = await runOnce(stage, src, data, updated, library, signal);
      samples.push(s);
      if (samples.length === 1 && library !== 'shell' && s.mountMs + s.updateMs > SLOW_MS) break;
    } catch (e) {
      if (e instanceof TimeoutError && library !== 'shell') return timedOut();
      if (!(e instanceof HiddenError)) throw e;
    }
  }
  const kept = samples.length > warmup ? samples.slice(warmup) : samples;
  const blocking = kept.map(s => s.blockingMs);
  return {
    mount: summarize(kept.map(s => s.mountMs)),
    update: summarize(kept.map(s => s.updateMs)),
    blocking: blocking.every(b => b !== null) ? summarize(blocking) : null,
    domNodes: kept[kept.length - 1]!.domNodes,
  };
}

export const NOT_ISOLATED =
  'This browser runs the chart frame in the same process as this page, so a ~100k chart could freeze the tab with no way to stop it. Use Chrome or Edge for ~100k, or pick a smaller sample.';

export async function measureAll(
  stage: HTMLElement,
  libraries: string[],
  data: Parsed,
  options: Omit<Options, 'runs' | 'warmup'> & {
    onProgress: (done: number, total: number, library: string) => void;
  },
): Promise<Measurements> {
  const { onProgress, requireIsolation, ...rest } = options;
  const total = libraries.length + (floor ? 0 : 1);
  let done = 0;
  // An offscreen frame gets throttled rendering, so scrolling the lab away counts as a hidden tab.
  const observer = new IntersectionObserver(entries => {
    inView = entries[entries.length - 1]!.isIntersecting;
    visibility.dispatchEvent(new Event('change'));
  });
  observer.observe(stage.closest('[data-lab]') ?? stage);
  try {
    if (isolation === undefined) {
      const params = new URLSearchParams(rest.query);
      params.set('embed', 'lab');
      isolation = await isolated(stage, frameSrc('shell', data.chart, params), rest.signal);
    }
    if (requireIsolation && !isolation) throw new Error(NOT_ISOLATED);
    if (!floor) {
      onProgress(done++, total, 'shell');
      floor = await measureLibrary(stage, 'shell', data, rest);
    }
    const results: Record<string, LibraryResult> = {};
    for (const library of libraries) {
      onProgress(done++, total, library);
      results[library] = await measureLibrary(stage, library, data, rest);
    }
    return { floor, results };
  } finally {
    observer.disconnect();
    inView = true;
  }
}
