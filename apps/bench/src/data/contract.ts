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
