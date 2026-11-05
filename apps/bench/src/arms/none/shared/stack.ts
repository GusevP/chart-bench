import type { Categories } from '../../../data/contract';

export function stack({ categories, series }: Categories) {
  const tops = categories.map(() => 0);
  const layers = series.map(s => s.values.map((v, i) => (tops[i]! += v)));
  return { layers, max: Math.max(...tops) };
}
