import type { Categories } from './contract';
import { PALETTE, prng } from './generate';

export const GALLERY_DATASETS = {
  'stacked-bar': {
    typical: { seed: 5, categories: 12, series: 3 },
    heavy: { seed: 6, categories: 200, series: 6 },
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
