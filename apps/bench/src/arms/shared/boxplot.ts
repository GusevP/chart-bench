import type { BoxGroups } from '../../data/contract';

export const BOX_RATIO = 0.6;
export const BOX_STROKE = '#333';
export const BOX_STROKE_WIDTH = 1.5;
export const BOX_OUTLIER_RADIUS = 2;
export const BOX_OUTLIER_COLOR = BOX_STROKE;

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
  outliers: number[];
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
  const isInside = (v: number) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr;
  const inside = sorted.filter(isInside);
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
    outliers: sorted.filter(v => !isInside(v)),
  };
}

export const boxplotStats = (data: BoxGroups): BoxStats[] =>
  data.groups.map(g => ({ id: g.id, color: g.color, ...boxStats(g.values) }));

const fix = (v: number) => Number(v.toPrecision(12));

const niceStep = (span: number) => {
  const raw = span / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  return fix((f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow);
};

export function boxScale(stats: BoxStats[]) {
  const lo = Math.min(...stats.map(s => s.min));
  const hi = Math.max(...stats.map(s => s.max));
  const step = lo === hi ? 1 : niceStep(hi - lo);
  const domain: [number, number] =
    lo === hi ? [lo - 1, hi + 1] : [fix(Math.floor(lo / step) * step), fix(Math.ceil(hi / step) * step)];
  const count = Math.round((domain[1] - domain[0]) / step);
  return { domain, step, ticks: Array.from({ length: count + 1 }, (_, i) => fix(domain[0] + i * step)) };
}

export const boxPaddingInner = 1 - BOX_RATIO;
export const boxPaddingOuter = boxPaddingInner / 2;
