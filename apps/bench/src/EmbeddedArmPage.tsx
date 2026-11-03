import { BenchStage, MEASURE, benchWindow } from 'bench-stage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { CommitMark, HEIGHT, WIDTH, fromUrl, markNaive } from './ArmPage';
import type { Payload } from './ArmPage';
import type { Arm } from './data/contract';

export type DataMessage = {
  type: 'bench:data';
  runId: number;
  mode: 'mount' | 'update';
  updateSettle: 'raf' | 'signal';
} & Payload;
export type ResultMessage =
  | { type: 'bench:ready' }
  | {
      type: 'bench:result';
      runId: number;
      mode: 'mount';
      mountMs: number;
      blockingMs: number | null;
      domNodes: number;
    }
  | { type: 'bench:result'; runId: number; mode: 'update'; updateMs: number }
  | { type: 'bench:hover'; maxFrameMs: number }
  | { type: 'bench:error'; runId: number | null; message: string };

const UPDATE_START = 'play:update-start';
const UPDATE_END = 'play:update-end';
const UPDATE = 'play:update';

type LoafEntry = PerformanceEntry & { blockingDuration: number };

const toParent = (message: ResultMessage) => window.parent.postMessage(message, location.origin);

const doubleRaf = (done: () => void) => requestAnimationFrame(() => requestAnimationFrame(() => done()));

const supportsLoaf = PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame') ?? false;
const frames: LoafEntry[] = [];
if (supportsLoaf) {
  new PerformanceObserver(list => frames.push(...(list.getEntries() as LoafEntry[]))).observe({
    type: 'long-animation-frame',
    buffered: true,
  });
}

async function blockingBetween(start: number, end: number): Promise<number | null> {
  if (!supportsLoaf) return null;
  await new Promise<void>(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
  return frames
    .filter(f => f.startTime < end && f.startTime + f.duration > start)
    .reduce((sum, f) => sum + f.blockingDuration, 0);
}

function EmbeddedArmPage({ arm }: { arm: Arm }) {
  const [payload, setPayload] = useState<Payload>(fromUrl);
  const [version, setVersion] = useState(0);
  const runIdRef = useRef<number | null>(null);
  const modeRef = useRef<'mount' | 'update'>('mount');
  const settleRef = useRef<'raf' | 'signal'>('raf');
  const updatePending = useRef(false);

  const finishUpdate = useCallback(() => {
    if (!updatePending.current) return;
    updatePending.current = false;
    doubleRaf(() => {
      performance.mark(UPDATE_END);
      const entry = performance.measure(UPDATE, UPDATE_START, UPDATE_END);
      toParent({ type: 'bench:result', runId: runIdRef.current!, mode: 'update', updateMs: entry.duration });
    });
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<DataMessage>) => {
      const msg = event.data;
      if (event.origin !== location.origin || event.source !== window.parent || msg?.type !== 'bench:data')
        return;
      runIdRef.current = msg.runId;
      modeRef.current = msg.mode;
      settleRef.current = msg.updateSettle;
      setPayload(msg);
      if (msg.mode === 'mount') setVersion(v => v + 1);
      else {
        performance.clearMarks(UPDATE_START);
        performance.clearMarks(UPDATE_END);
        performance.clearMeasures(UPDATE);
        performance.mark(UPDATE_START);
        updatePending.current = true;
      }
    };
    const onError = (event: ErrorEvent) =>
      toParent({ type: 'bench:error', runId: runIdRef.current, message: String(event.message) });
    const observer = new PerformanceObserver(list => {
      if (modeRef.current !== 'mount' || !list.getEntriesByName(MEASURE).length) return;
      const runId = runIdRef.current!;
      const start = performance.getEntriesByName('bench:start').at(-1)!.startTime;
      const end = performance.getEntriesByName('bench:settled').at(-1)!.startTime;
      void blockingBetween(start, end).then(blockingMs =>
        toParent({
          type: 'bench:result',
          runId,
          mode: 'mount',
          mountMs: end - start,
          blockingMs,
          domNodes: document.querySelectorAll('[data-bench-stage] *').length,
        }),
      );
    });
    observer.observe({ type: 'measure' });
    window.addEventListener('message', onMessage);
    window.addEventListener('error', onError);
    toParent({ type: 'bench:ready' });
    return () => {
      observer.disconnect();
      window.removeEventListener('message', onMessage);
      window.removeEventListener('error', onError);
    };
  }, []);

  // Runs after the re-keyed BenchStage has installed its API (child effects run first).
  useEffect(() => {
    if (version) benchWindow().benchStage?.mount();
  }, [version]);

  // Child passive effects (react-chartjs-2's chart.update()) run before this one.
  useEffect(() => {
    if (settleRef.current === 'raf') finishUpdate();
  }, [payload, finishUpdate]);

  const onSettledRef = useRef<() => void>(() => {});
  const settled = useCallback(() => {
    markNaive();
    onSettledRef.current();
  }, []);

  return (
    <BenchStage key={version} width={WIDTH} height={HEIGHT} settleMode={arm.settleMode}>
      {({ onSettled }) => {
        onSettledRef.current = () => {
          if (modeRef.current === 'update') {
            if (settleRef.current === 'signal') finishUpdate();
          } else onSettled();
        };
        return (
          <>
            {payload.chart === 'survival' ? (
              <arm.Survival width={WIDTH} height={HEIGHT} series={payload.series} onSettled={settled} />
            ) : (
              <arm.Scatter width={WIDTH} height={HEIGHT} series={payload.series} onSettled={settled} />
            )}
            {arm.settleMode === 'raf' && <CommitMark />}
          </>
        );
      }}
    </BenchStage>
  );
}

export function mountEmbedded(arm: Arm) {
  createRoot(document.getElementById('root')!).render(<EmbeddedArmPage arm={arm} />);
}
