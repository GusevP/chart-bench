const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
};

/** Median and interquartile range. Means and p95 are skewed by the one GC pause per run. */
export function summarize(values: number[]): {
  median: number;
  iqr: number;
  n: number;
} {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return { median: Number.NaN, iqr: Number.NaN, n: 0 };
  return {
    median: quantile(sorted, 0.5),
    iqr: quantile(sorted, 0.75) - quantile(sorted, 0.25),
    n: sorted.length,
  };
}
