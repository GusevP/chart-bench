import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { MARK_SETTLED, MARK_START, MEASURE, benchWindow } from './window';

/**
 * - `raf`: done when React commits. Right for SVG, where the browser paints what was committed.
 * - `signal`: done when the chart calls `onSettled`. Required for Canvas charts that draw after
 *   commit (in a passive effect or on their own schedule) — `raf` would time a blank canvas.
 */
export type SettleMode = 'raf' | 'signal';

export type BenchStageProps = {
  width?: number;
  height?: number;
  settleMode?: SettleMode;
  children: (api: { onSettled: () => void }) => ReactNode;
};

/**
 * Mounts its child on command and measures mount → painted.
 *
 * Nothing renders until `window.benchStage.mount()` is called, so page load and module
 * evaluation (identical for every candidate) stay out of the number.
 */
export function BenchStage({ width = 900, height = 600, settleMode = 'raf', children }: BenchStageProps) {
  const [runId, setRunId] = useState(0);
  const [mounted, setMounted] = useState(false);
  const requestedRef = useRef(false);
  const framesRef = useRef<[number, number]>([0, 0]);

  // Both settle modes end in the same double rAF. Marking straight from `onSettled` would
  // stop the clock before paint and hand Canvas charts a free frame over SVG ones.
  const requestSettle = useCallback(() => {
    if (requestedRef.current) return;
    requestedRef.current = true;
    const outer = requestAnimationFrame(() => {
      const inner = requestAnimationFrame(() => {
        performance.mark(MARK_SETTLED);
        performance.measure(MEASURE, MARK_START, MARK_SETTLED);
        benchWindow().benchStageSettled = true;
      });
      framesRef.current = [outer, inner];
    });
    framesRef.current = [outer, 0];
  }, []);

  const startRun = useCallback(() => {
    requestedRef.current = false;
    benchWindow().benchStageSettled = false;
    performance.clearMarks(MARK_START);
    performance.clearMarks(MARK_SETTLED);
    performance.clearMeasures(MEASURE);
    performance.mark(MARK_START);
  }, []);

  useEffect(() => {
    const target = benchWindow();
    target.benchStage = {
      mount: () => {
        startRun();
        setMounted(true);
      },
      remount: () => {
        startRun();
        setRunId(id => id + 1);
      },
    };
    target.benchStageReady = true;
    return () => {
      target.benchStage = undefined;
      target.benchStageReady = false;
    };
  }, [startRun]);

  useLayoutEffect(() => {
    if (mounted && settleMode === 'raf') requestSettle();
    return () => {
      const [outer, inner] = framesRef.current;
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [mounted, runId, settleMode, requestSettle]);

  return (
    <div data-bench-stage style={{ width, height }}>
      {mounted && (
        <div key={runId} style={{ width, height }}>
          {children({ onSettled: requestSettle })}
        </div>
      )}
    </div>
  );
}
