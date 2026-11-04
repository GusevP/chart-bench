import { MARGIN } from '../../data/spec';

export const INNER_RATIO = 0.6;

export const donutRadius = (width: number, height: number) =>
  Math.min(width - MARGIN.left - MARGIN.right, height - MARGIN.top - MARGIN.bottom) / 2;
