import type { Categories } from '../../data/contract';
import { donutRadius } from './donut';

export const RADAR_RINGS = 5;
export const RADAR_FILL_OPACITY = 0.2;
export const RADAR_STROKE_WIDTH = 2;
export const RADAR_GRID_COLOR = '#ccc';

export const radarRadius = donutRadius;

export const radarMax = ({ series }: Categories) =>
  series.reduce((m, s) => s.values.reduce((a, v) => Math.max(a, v), m), 0) || 1;

export const radarRings = (max: number) =>
  Array.from({ length: RADAR_RINGS }, (_, i) => (max * (i + 1)) / RADAR_RINGS);
