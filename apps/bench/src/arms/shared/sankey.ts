import type { Sankey } from '../../data/contract';
import { PALETTE } from '../../data/generate';

export const NODE_WIDTH = 12;
export const NODE_GAP = 10;
export const ITERATIONS = 6;
export const LINK_OPACITY = 0.4;

export const sankeyColors = (data: Sankey) =>
  new Map(data.nodes.map((n, i) => [n.id, PALETTE[i % PALETTE.length]!]));
