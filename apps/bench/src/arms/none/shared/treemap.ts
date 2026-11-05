import type { TreeNode } from '../../../data/contract';

const GOLDEN = (1 + Math.sqrt(5)) / 2;

export type Box = {
  id: string;
  value: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  children?: Box[];
};

const sized = ({ id, value, children }: TreeNode): Box => {
  const kids = children?.map(sized);
  return {
    id,
    value: kids ? kids.reduce((sum, kid) => sum + kid.value, 0) : value!,
    x0: 0,
    y0: 0,
    x1: 0,
    y1: 0,
    children: kids,
  };
};

const tile = (parent: Box) => {
  const nodes = parent.children;
  if (!nodes) return;
  const { x1, y1 } = parent;
  let { x0, y0, value } = parent;
  for (let start = 0, end = 0; start < nodes.length; start = end) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const alpha = Math.max(dy / dx, dx / dy) / (value * GOLDEN);
    const worst = (total: number, lo: number, hi: number) => {
      const beta = total * total * alpha;
      return Math.max(hi / beta, beta / lo);
    };
    let sum = nodes[start]!.value;
    let min = sum;
    let max = sum;
    let best = worst(sum, min, max);
    for (end = start + 1; end < nodes.length; end++) {
      const next = nodes[end]!.value;
      const ratio = worst(sum + next, Math.min(min, next), Math.max(max, next));
      if (ratio > best) break;
      best = ratio;
      sum += next;
      min = Math.min(min, next);
      max = Math.max(max, next);
    }

    // `value` drifts as rows are subtracted, so the last row takes what is left of the parent.
    const share = end === nodes.length ? 1 : sum / value;
    const across = dx < dy;
    const edge = across ? y0 + dy * share : x0 + dx * share;
    const step = (across ? dx : dy) / sum;
    let at = across ? x0 : y0;
    for (let i = start; i < end; i++) {
      const box = nodes[i]!;
      const next = at + box.value * step;
      [box.x0, box.y0, box.x1, box.y1] = across ? [at, y0, next, edge] : [x0, at, edge, next];
      at = next;
    }
    if (across) y0 = edge;
    else x0 = edge;
    value -= sum;
  }
  nodes.forEach(tile);
};

export const squarify = (root: TreeNode, x0: number, y0: number, x1: number, y1: number) => {
  const box = { ...sized(root), x0, y0, x1, y1 };
  tile(box);
  return box;
};

export const boxLeaves = (box: Box, leaves: Box[] = []): Box[] => {
  if (box.children) for (const child of box.children) boxLeaves(child, leaves);
  else leaves.push(box);
  return leaves;
};
