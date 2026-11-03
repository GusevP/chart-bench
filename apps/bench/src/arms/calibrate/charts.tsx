import { useEffect, useMemo, useRef } from 'react';

import type { Arm, ScatterChartProps, SurvivalChartProps } from '../../data/contract';

const params = new URLSearchParams(location.search);
const cost = Number(params.get('cost') ?? 0);
const hoverCost = Number(params.get('hoverCost') ?? 0);
const inEffect = params.get('drawIn') === 'effect';
const signal = params.get('settle') === 'signal';
const shouldThrow = params.get('throw') === '1';

function busyWait(ms: number) {
  const end = performance.now() + ms;
  while (performance.now() < end);
}

function Calibrate({ width, height, series, onSettled }: SurvivalChartProps | ScatterChartProps) {
  if (shouldThrow) throw new Error('calibrate: throw=1');
  const settledRef = useRef(onSettled);
  settledRef.current = onSettled;

  useMemo(() => {
    if (!inEffect && !signal) busyWait(cost);
  }, [series]);

  useEffect(() => {
    if (inEffect) busyWait(cost);
    if (!signal) return;
    const id = setTimeout(() => {
      busyWait(cost);
      settledRef.current();
    }, 50);
    return () => clearTimeout(id);
  }, [series]);

  return <div style={{ width, height }} onPointerMove={() => busyWait(hoverCost)} />;
}

export const arm: Arm = { settleMode: signal ? 'signal' : 'raf', Survival: Calibrate, Scatter: Calibrate };
