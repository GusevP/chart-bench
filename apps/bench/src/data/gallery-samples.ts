import type { Categories, Combo, Donut, Heatmap } from './contract';
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
  combo: {
    typical: { seed: 13, categories: 24 },
    heavy: { seed: 14, categories: 500 },
  },
  heatmap: {
    typical: { seed: 15, columns: 20, rows: 20 },
    heavy: { seed: 16, columns: 100, rows: 100 },
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

export function generateCombo({ seed, categories }: { seed: number; categories: number }): Combo {
  const rand = prng(seed);
  return {
    categories: Array.from({ length: categories }, (_, i) => `C${i + 1}`),
    bars: {
      id: 'Volume',
      color: PALETTE[0]!,
      values: Array.from({ length: categories }, () => Math.round(10 + 40 * rand())),
    },
    line: {
      id: 'Trend',
      color: PALETTE[1]!,
      values: Array.from({ length: categories }, () => Math.round(200 + 600 * rand())),
    },
  };
}

/** One series per line: readable as a format example, and still small for heavy samples. */
export const formatCombo = ({ categories, bars, line }: Combo) =>
  `{\n  "categories": ${JSON.stringify(categories)},\n  "bars": ${JSON.stringify(bars)},\n  "line": ${JSON.stringify(line)}\n}`;

export function generateHeatmap({
  seed,
  columns,
  rows,
}: {
  seed: number;
  columns: number;
  rows: number;
}): Heatmap {
  const rand = prng(seed);
  return {
    xs: Array.from({ length: columns }, (_, i) => `X${i + 1}`),
    ys: Array.from({ length: rows }, (_, i) => `Y${i + 1}`),
    values: Array.from({ length: rows }, () => Array.from({ length: columns }, () => Math.round(100 * rand()))),
  };
}

/** One row per line: readable as a format example, and still small for heavy samples. */
export const formatHeatmap = ({ xs, ys, values }: Heatmap) =>
  `{\n  "xs": ${JSON.stringify(xs)},\n  "ys": ${JSON.stringify(ys)},\n  "values": [\n` +
  values.map(row => `    ${JSON.stringify(row)}`).join(',\n') +
  '\n  ]\n}';
