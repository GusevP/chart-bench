import type { BoxGroups } from '../../data/contract';

export const BOX_RATIO = 0.6;
export const BOX_STROKE = '#333';
export const BOX_STROKE_WIDTH = 1.5;

export type BoxStats = {
  id: string;
  color: string;
  n: number;
  mean: number;
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  whiskerLow: number;
  whiskerHigh: number;
};

const quantile = (sorted: number[], p: number) => {
  const at = (sorted.length - 1) * p;
  const lo = Math.floor(at);
  return sorted[lo]! + (sorted[Math.ceil(at)]! - sorted[lo]!) * (at - lo);
};

export function boxStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const median = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const inside = sorted.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
  return {
    n: sorted.length,
    mean: sorted.reduce((a, b) => a + b, 0) / sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    q1,
    median,
    q3,
    whiskerLow: inside[0]!,
    whiskerHigh: inside[inside.length - 1]!,
  };
}

export const boxplotStats = (data: BoxGroups): BoxStats[] =>
  data.groups.map(g => ({ id: g.id, color: g.color, ...boxStats(g.values) }));

export function boxDomain(stats: BoxStats[]): [number, number] {
  const lo = Math.min(...stats.map(s => s.whiskerLow));
  const hi = Math.max(...stats.map(s => s.whiskerHigh));
  if (lo === hi) return [lo - 1, hi + 1];
  const raw = (hi - lo) / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
  const fix = (v: number) => Number(v.toPrecision(12));
  return [fix(Math.floor(lo / step) * step), fix(Math.ceil(hi / step) * step)];
}

export const boxPaddingInner = 1 - BOX_RATIO;
export const boxPaddingOuter = boxPaddingInner / 2;
