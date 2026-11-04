import { BenchStage, MEASURE, benchWindow } from 'bench-stage';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

import { CommitMark, HEIGHT, WIDTH, fromUrl, markNaive } from './ArmPage';
import type { Payload } from './ArmPage';

export type RenderChart = (payload: Payload, onSettled: () => void) => ReactNode;

export type DataMessage = {
  type: 'bench:data';
  runId: number;
  mode: 'mount' | 'update';
  updateSettle: 'raf' | 'signal';
} & Payload;
export type ResultMessage =
  | { type: 'bench:ready'; settleMode: 'raf' | 'signal' }
  | {
      type: 'bench:result';
      runId: number;
      mode: 'mount';
      mountMs: number;
      startAt: number;
      endAt: number;
      domNodes: number;
    }
  | { type: 'bench:result'; runId: number; mode: 'update'; updateMs: number }
  | { type: 'bench:hover'; maxFrameMs: number }
  | { type: 'bench:error'; runId: number | null; message: string };

const UPDATE_START = 'play:update-start';
const UPDATE_END = 'play:update-end';
const UPDATE = 'play:update';

export const toParent = (message: ResultMessage) => window.parent.postMessage(message, location.origin);

const doubleRaf = (done: () => void) => requestAnimationFrame(() => requestAnimationFrame(() => done()));

const inStage = (target: EventTarget | null) =>
  target instanceof Element && target.closest('[data-bench-stage]') !== null;

const HOVER_IDLE_MS = 500;

function trackHover() {
  let raf = 0;
  let last = 0;
  let lastMove = 0;
  let skipFirst = true;
  let max = 0;
  const tick = (now: number) => {
    if (skipFirst) skipFirst = false;
    else if (now - last > max) {
      max = now - last;
      toParent({ type: 'bench:hover', maxFrameMs: max });
    }
    last = now;
    raf = now - lastMove > HOVER_IDLE_MS ? 0 : requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    max = 0;
  };
  const onMove = (event: PointerEvent) => {
    if (!inStage(event.target)) return;
    lastMove = performance.now();
    if (raf) return;
    last = lastMove;
    skipFirst = true;
    raf = requestAnimationFrame(tick);
  };
  const onOut = (event: PointerEvent) => {
    if (!inStage(event.relatedTarget)) stop();
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerout', onOut);
  document.addEventListener('visibilitychange', stop);
  return () => {
    stop();
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerout', onOut);
    document.removeEventListener('visibilitychange', stop);
  };
}

function EmbeddedArmPage({ settleMode, render }: { settleMode: 'raf' | 'signal'; render: RenderChart }) {
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
      toParent({
        type: 'bench:result',
        runId,
        mode: 'mount',
        mountMs: end - start,
        startAt: performance.timeOrigin + start,
        endAt: performance.timeOrigin + end,
        domNodes: document.querySelectorAll('[data-bench-stage] *').length,
      });
    });
    observer.observe({ type: 'measure' });
    window.addEventListener('message', onMessage);
    window.addEventListener('error', onError);
    const stopHover = new URLSearchParams(location.search).get('embed') === 'display' ? trackHover() : null;
    toParent({ type: 'bench:ready', settleMode });
    return () => {
      stopHover?.();
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
    <BenchStage key={version} width={WIDTH} height={HEIGHT} settleMode={settleMode}>
      {({ onSettled }) => {
        onSettledRef.current = () => {
          if (modeRef.current === 'update') {
            if (settleRef.current === 'signal') finishUpdate();
          } else onSettled();
        };
        return (
          <>
            {render(payload, settled)}
            {settleMode === 'raf' && <CommitMark />}
          </>
        );
      }}
    </BenchStage>
  );
}

export function mountEmbedded(settleMode: 'raf' | 'signal', render: RenderChart) {
  createRoot(document.getElementById('root')!).render(
    <EmbeddedArmPage settleMode={settleMode} render={render} />,
  );
}
