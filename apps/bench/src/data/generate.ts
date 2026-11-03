import type { ScatterSeries, SurvivalPoint, SurvivalSeries } from './contract';

/** splitmix32 — tiny seeded PRNG, so every library gets byte-identical data. */
export function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x9e3779b9) >>> 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15;
    t = Math.imul(t, 0x735a2d97);
    t ^= t >>> 15;
    return (t >>> 0) / 4294967296;
  };
}

export const PALETTE = [
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#ca8a04',
  '#db2777',
];

const color = (i: number) => PALETTE[i % PALETTE.length]!;

export function generateSurvival({ seed, series, points }: { seed: number; series: number; points: number }) {
  const rand = prng(seed);
  const out: SurvivalSeries[] = [];
  for (let s = 0; s < series; s++) {
    const totalDecline = 0.45 + 0.4 * rand();
    let y = 1;
    let x = 0;
    const pts: SurvivalPoint[] = [];
    for (let i = 0; i < points; i++) {
      x += 1 + Math.floor(rand() * 3);
      const censored = rand() < 0.08;
      if (!censored) y = Math.max(0.02, y - (totalDecline / points) * (2 * rand()));
      const band = 0.02 + 0.08 * (i / points);
      pts.push({
        x,
        y,
        lower: Math.max(0, y - band),
        upper: Math.min(1, y + band),
        censored,
      });
    }
    out.push({
      id: `Arm ${String.fromCharCode(65 + s)}`,
      color: color(s),
      points: pts,
    });
  }
  return out;
}

export function generateScatter({ seed, points, groups }: { seed: number; points: number; groups: number }) {
  const rand = prng(seed);
  const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());
  const out: ScatterSeries[] = Array.from({ length: groups }, (_, g) => ({
    id: `Group ${g + 1}`,
    color: color(g),
    points: [],
  }));
  for (let i = 0; i < points; i++) {
    const g = i % groups;
    out[g]!.points.push({
      x: 20 + g * 12 + gauss() * 8,
      y: 40 + g * 6 + gauss() * 10,
      size: 3 + Math.floor(rand() * 6),
    });
  }
  return out;
}

export const DATASETS = {
  survival: {
    typical: { seed: 1, series: 3, points: 200 },
    heavy: { seed: 2, series: 6, points: 1000 },
  },
  scatter: {
    typical: { seed: 3, points: 500, groups: 5 },
    heavy: { seed: 4, points: 10_000, groups: 5 },
  },
} as const;

export type ChartKind = keyof typeof DATASETS;
export type DatasetSize = 'typical' | 'heavy';
