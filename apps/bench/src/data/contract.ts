import type { ReactNode } from 'react';

export type SurvivalPoint = {
  /** Time since start, in days. */
  x: number;
  /** Fraction still event-free, 0..1. */
  y: number;
  lower: number;
  upper: number;
  /** A subject left the study here without an event; drawn as a tick on the line. */
  censored: boolean;
};

export type SurvivalSeries = {
  id: string;
  color: string;
  points: SurvivalPoint[];
};

export type ScatterPoint = { x: number; y: number; size: number };

export type ScatterSeries = {
  id: string;
  color: string;
  points: ScatterPoint[];
};

export type CategorySeries = { id: string; color: string; values: number[] };
export type Categories = { categories: string[]; series: CategorySeries[] };
export type Combo = { categories: string[]; bars: CategorySeries; line: CategorySeries };
export type Donut = { slices: { id: string; color: string; value: number }[] };
export type Heatmap = { xs: string[]; ys: string[]; values: number[][] };
export type TreeNode = { id: string; value?: number; children?: TreeNode[] };
export type Sankey = {
  nodes: { id: string }[];
  links: { source: string; target: string; value: number }[];
};
export type BoxGroups = { groups: { id: string; color: string; values: number[] }[] };
export type Candles = {
  candles: { t: string; open: number; high: number; low: number; close: number }[];
};

export type Shapes = {
  'stacked-bar': Categories;
  'stacked-area': Categories;
  donut: Donut;
  radar: Categories;
  combo: Combo;
  heatmap: Heatmap;
  treemap: TreeNode;
  sankey: Sankey;
  boxplot: BoxGroups;
  candlestick: Candles;
};
export type GalleryKind = keyof Shapes;
export type ChartKind = 'survival' | 'scatter' | GalleryKind;

export type Payload =
  | { chart: 'survival'; series: SurvivalSeries[] }
  | { chart: 'scatter'; series: ScatterSeries[] }
  | { [K in GalleryKind]: { chart: K; data: Shapes[K] } }[GalleryKind];

export type ChartSize = { width: number; height: number };

export type SurvivalChartProps = ChartSize & {
  series: SurvivalSeries[];
  onSettled: () => void;
};
export type ScatterChartProps = ChartSize & {
  series: ScatterSeries[];
  onSettled: () => void;
};

export type Arm = {
  /** `signal` for renderers that paint after React commits; see bench-stage's SettleMode. */
  settleMode: 'raf' | 'signal';
  Survival: (props: SurvivalChartProps) => ReactNode;
  Scatter: (props: ScatterChartProps) => ReactNode;
};
