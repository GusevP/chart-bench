import type { Categories, Donut } from './contract';
import { PALETTE, prng } from './generate';

export const GALLERY_DATASETS = {
  'stacked-bar': {
    typical: { seed: 5, categories: 12, series: 3 },
    heavy: { seed: 6, categories: 200, series: 6 },
  },
  'stacked-area': {
    typical: { seed: 7, categories: 50, series: 4 },
    heavy: { seed: 8, categories: 1000, series: 8 },
  },
  radar: {
    typical: { seed: 11, categories: 6, series: 3 },
    heavy: { seed: 12, categories: 24, series: 8 },
  },
  donut: {
    typical: { seed: 9, slices: 6 },
    heavy: { seed: 10, slices: 60 },
  },
} as const;

export function generateCategories({
  seed,
  categories,
  series,
}: {
  seed: number;
  categories: number;
  series: number;
}): Categories {
  const rand = prng(seed);
  return {
    categories: Array.from({ length: categories }, (_, i) => `C${i + 1}`),
    series: Array.from({ length: series }, (_, s) => ({
      id: `Series ${s + 1}`,
      color: PALETTE[s % PALETTE.length]!,
      values: Array.from({ length: categories }, () => Math.round(10 + 40 * rand())),
    })),
  };
}

/** One series per line: readable as a format example, and still small for heavy samples. */
export const formatCategories = ({ categories, series }: Categories) =>
  `{\n  "categories": ${JSON.stringify(categories)},\n  "series": [\n` +
  series.map(s => `    ${JSON.stringify(s)}`).join(',\n') +
  '\n  ]\n}';

export function generateDonut({ seed, slices }: { seed: number; slices: number }): Donut {
  const rand = prng(seed);
  return {
    slices: Array.from({ length: slices }, (_, i) => ({
      id: `Slice ${i + 1}`,
      color: PALETTE[i % PALETTE.length]!,
      value: Math.round(10 + 40 * rand()),
    })),
  };
}

/** One slice per line: readable as a format example, and still small for heavy samples. */
export const formatDonut = ({ slices }: Donut) =>
  `{\n  "slices": [\n${slices.map(s => `    ${JSON.stringify(s)}`).join(',\n')}\n  ]\n}`;
