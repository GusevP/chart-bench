import type { BoxGroups, Categories, Combo, Donut, Heatmap, Sankey, TreeNode } from './contract';
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
  treemap: {
    typical: { seed: 17, leaves: 50, groups: 5 },
    heavy: { seed: 18, leaves: 5000, groups: 50 },
  },
  sankey: {
    typical: { seed: 19, nodes: 12, links: 20, layers: 4 },
    heavy: { seed: 20, nodes: 150, links: 500, layers: 6 },
  },
  boxplot: {
    typical: { seed: 21, groups: 8, values: 200 },
    heavy: { seed: 22, groups: 40, values: 2500 },
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


export function generateTreemap({
  seed,
  leaves,
  groups,
}: {
  seed: number;
  leaves: number;
  groups: number;
}): TreeNode {
  const rand = prng(seed);
  const perGroup = leaves / groups;
  return {
    id: 'Root',
    children: Array.from({ length: groups }, (_, g) => ({
      id: `Group ${g + 1}`,
      children: Array.from({ length: perGroup }, (_, i) => ({
        id: `Leaf ${g * perGroup + i + 1}`,
        value: Math.round(5 + 95 * rand()),
      })),
    })),
  };
}

/** One leaf per line: readable as a format example, and still small for heavy samples. */
export const formatTreemap = (node: TreeNode, indent = ''): string =>
  node.children
    ? `${indent}{"id": ${JSON.stringify(node.id)}, "children": [\n` +
      node.children.map(c => formatTreemap(c, `${indent}  `)).join(',\n') +
      `\n${indent}]}`
    : `${indent}${JSON.stringify(node)}`;

export function generateSankey({
  seed,
  nodes,
  links,
  layers,
}: {
  seed: number;
  nodes: number;
  links: number;
  layers: number;
}): Sankey {
  const rand = prng(seed);
  const perLayer = Math.ceil(nodes / layers);
  const layerOf = (i: number) => Math.floor(i / perLayer);
  const pick = (from: number, to: number) => from + Math.floor(rand() * (to - from));
  const seen = new Set<string>();
  const out: Sankey['links'] = [];
  const add = (s: number, t: number) => {
    const key = `${s}>${t}`;
    if (seen.has(key)) return false;
    seen.add(key);
    out.push({ source: `Node ${s + 1}`, target: `Node ${t + 1}`, value: Math.round(1 + 19 * rand()) });
    return true;
  };
  const layerStart = (l: number) => Math.min(l * perLayer, nodes);
  for (let t = perLayer; t < nodes; t++) add(pick(layerStart(layerOf(t) - 1), layerStart(layerOf(t))), t);
  for (let s = 0; s < nodes; s++)
    if (!out.some(l => l.source === `Node ${s + 1}`) && layerOf(s) < layerOf(nodes - 1))
      add(s, pick(layerStart(layerOf(s) + 1), Math.min(layerStart(layerOf(s) + 2), nodes)));
  for (let guard = 0; out.length < links && guard < links * 20; guard++) {
    const s = pick(0, nodes - perLayer);
    add(s, pick(layerStart(layerOf(s) + 1), nodes));
  }
  return { nodes: Array.from({ length: nodes }, (_, i) => ({ id: `Node ${i + 1}` })), links: out };
}

/** One node or link per line: readable as a format example, and still small for heavy samples. */
export const formatSankey = ({ nodes, links }: Sankey) =>
  `{\n  "nodes": [\n` +
  nodes.map(n => `    ${JSON.stringify(n)}`).join(',\n') +
  `\n  ],\n  "links": [\n` +
  links.map(l => `    ${JSON.stringify(l)}`).join(',\n') +
  '\n  ]\n}';

export function generateBoxplot({
  seed,
  groups,
  values,
}: {
  seed: number;
  groups: number;
  values: number;
}): BoxGroups {
  const rand = prng(seed);
  const normal = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  return {
    groups: Array.from({ length: groups }, (_, g) => {
      const center = 40 + 30 * rand();
      const spread = 4 + 10 * rand();
      return {
        id: `Group ${g + 1}`,
        color: PALETTE[g % PALETTE.length]!,
        values: Array.from({ length: values }, () => Math.round((center + spread * normal()) * 10) / 10),
      };
    }),
  };
}

/** One group per line: readable as a format example, and still small for heavy samples. */
export const formatBoxplot = ({ groups }: BoxGroups) =>
  `{\n  "groups": [\n${groups.map(g => `    ${JSON.stringify(g)}`).join(',\n')}\n  ]\n}`;
