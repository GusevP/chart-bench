import type { Sankey } from '../../../data/contract';
import { ITERATIONS, NODE_GAP, NODE_WIDTH } from '../../shared/sankey';

// d3-sankey lets gaps take the whole plot, which leaves every node zero-height in an overfull column.
const MAX_GAP_SHARE = 0.9;

export type SankeyNode = {
  id: string;
  value: number;
  layer: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  in: SankeyLink[];
  out: SankeyLink[];
};

export type SankeyLink = {
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  width: number;
  y0: number;
  y1: number;
};

const total = (items: { value: number }[]) => items.reduce((sum, item) => sum + item.value, 0);
const center = (node: SankeyNode) => (node.y0 + node.y1) / 2;

const moveTo = (node: SankeyNode, y0: number) => {
  node.y1 += y0 - node.y0;
  node.y0 = y0;
};

const assignLayers = (nodes: SankeyNode[]) => {
  const waiting = new Map(nodes.map(node => [node, node.in.length]));
  const queue = nodes.filter(node => !node.in.length);
  for (const node of queue)
    for (const { target } of node.out) {
      target.layer = Math.max(target.layer, node.layer + 1);
      const left = waiting.get(target)! - 1;
      waiting.set(target, left);
      if (!left) queue.push(target);
    }
};

const resolveCollisions = (column: SankeyNode[], top: number, bottom: number, gap: number) => {
  column.sort((a, b) => a.y0 - b.y0);
  let y = top;
  for (const node of column) {
    if (node.y0 < y) moveTo(node, y);
    y = node.y1 + gap;
  }
  y = bottom;
  for (let i = column.length - 1; i >= 0; i--) {
    const node = column[i]!;
    if (node.y1 > y) moveTo(node, y - (node.y1 - node.y0));
    y = node.y0 - gap;
  }
};

const pull = (node: SankeyNode, side: 'in' | 'out') => {
  let sum = 0;
  let weight = 0;
  for (const link of node[side]) {
    sum += center(side === 'in' ? link.source : link.target) * link.value;
    weight += link.value;
  }
  if (weight) moveTo(node, sum / weight - (node.y1 - node.y0) / 2);
};

export const sankeyLayout = (data: Sankey, x0: number, y0: number, x1: number, y1: number) => {
  const byId = new Map(
    data.nodes.map(({ id }) => [
      id,
      { id, value: 0, layer: 0, x0: 0, y0: 0, x1: 0, y1: 0, in: [], out: [] } as SankeyNode,
    ]),
  );
  const links = data.links.map(({ source, target, value }) => {
    const link = { source: byId.get(source)!, target: byId.get(target)!, value, width: 0, y0: 0, y1: 0 };
    link.source.out.push(link);
    link.target.in.push(link);
    return link;
  });
  const nodes = [...byId.values()];
  assignLayers(nodes);

  const columns: SankeyNode[][] = [];
  for (const node of nodes) {
    node.value = Math.max(total(node.in), total(node.out));
    (columns[node.layer] ??= []).push(node);
  }

  const height = y1 - y0;
  // A fixed width runs links backward once columns sit closer than it, so deep graphs split each step evenly.
  const nodeWidth = Math.min(NODE_WIDTH, (x1 - x0) / (2 * columns.length - 1));
  const step = (x1 - x0 - nodeWidth) / Math.max(columns.length - 1, 1);
  const gap = Math.min(NODE_GAP, (MAX_GAP_SHARE * height) / (Math.max(...columns.map(c => c.length)) - 1));
  const k = Math.min(...columns.map(c => (height - (c.length - 1) * gap) / total(c)));

  for (const column of columns) {
    const free = (height - (column.length - 1) * gap - total(column) * k) / (column.length + 1);
    let y = y0 + free;
    for (const node of column) {
      node.x0 = x0 + node.layer * step;
      node.x1 = node.x0 + nodeWidth;
      node.y0 = y;
      node.y1 = y + node.value * k;
      y = node.y1 + gap + free;
    }
  }

  const reversed = [...columns].reverse();
  for (let i = 0; i < ITERATIONS; i++) {
    for (const column of columns) {
      for (const node of column) pull(node, 'in');
      resolveCollisions(column, y0, y1, gap);
    }
    for (const column of reversed) {
      for (const node of column) pull(node, 'out');
      resolveCollisions(column, y0, y1, gap);
    }
  }

  for (const link of links) link.width = link.value * k;
  for (const node of nodes) {
    let y = node.y0;
    for (const link of node.out.sort((a, b) => a.target.y0 - b.target.y0)) {
      link.y0 = y + link.width / 2;
      y += link.width;
    }
    y = node.y0;
    for (const link of node.in.sort((a, b) => a.source.y0 - b.source.y0)) {
      link.y1 = y + link.width / 2;
      y += link.width;
    }
  }

  return { nodes, links };
};

export const linkPath = ({ source, target, y0, y1 }: SankeyLink) => {
  const mid = (source.x1 + target.x0) / 2;
  return `M${source.x1},${y0}C${mid},${y0} ${mid},${y1} ${target.x0},${y1}`;
};
