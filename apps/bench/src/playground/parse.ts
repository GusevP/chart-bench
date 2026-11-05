import { treeLeaves } from '../arms/shared/treemap';
import type { ChartKind, GalleryKind, Payload, TreeNode } from '../data/contract';
import { DATASETS, PALETTE, generateScatter, generateSurvival } from '../data/generate';
import type { DatasetSize } from '../data/generate';
import {
  GALLERY_DATASETS,
  formatCategories,
  formatCombo,
  formatDonut,
  formatHeatmap,
  formatTreemap,
  generateCategories,
  generateCombo,
  generateDonut,
  generateHeatmap,
  generateTreemap,
} from '../data/gallery-samples';

export type Parsed = Payload;

type Kind = {
  label: string;
  hint: string;
  parse: (raw: unknown) => Parsed;
  nudge: (parsed: Parsed) => Parsed;
  sample: (size: DatasetSize) => string;
};

const num = (v: unknown, where: string) => {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new Error(`${where}: expected a number, got ${JSON.stringify(v)}`);
  return v;
};

function parsePoints(chart: 'survival' | 'scatter', raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Expected a non-empty array of series.');
  return raw.map((s: any, i) => {
    const where = `series[${i}]`;
    if (!s || !Array.isArray(s.points) || s.points.length === 0)
      throw new Error(`${where}: needs a non-empty "points" array.`);
    const id = s.id == null ? `Series ${i + 1}` : String(s.id);
    const color = typeof s.color === 'string' ? s.color : PALETTE[i % PALETTE.length]!;
    const points = s.points.map((p: any, j: number) => {
      const at = `${where}.points[${j}]`;
      const x = num(p?.x, `${at}.x`);
      const y = num(p?.y, `${at}.y`);
      return chart === 'survival'
        ? {
            x,
            y,
            lower: p.lower == null ? y : num(p.lower, `${at}.lower`),
            upper: p.upper == null ? y : num(p.upper, `${at}.upper`),
            censored: Boolean(p.censored),
          }
        : { x, y, size: p.size == null ? 4 : num(p.size, `${at}.size`) };
    });
    if (chart === 'survival') points.sort((a: { x: number }, b: { x: number }) => a.x - b.x);
    return { id, color, points };
  });
}

/** One point per line: readable as a format example, and still small for heavy samples. */
export function formatSeries(series: { id: string; color: string; points: object[] }[]) {
  const block = (s: (typeof series)[number]) =>
    `  {"id": ${JSON.stringify(s.id)}, "color": ${JSON.stringify(s.color)}, "points": [\n` +
    s.points.map(p => `    ${JSON.stringify(p)}`).join(',\n') +
    '\n  ]}';
  return `[\n${series.map(block).join(',\n')}\n]`;
}

const idOf = (raw: unknown, fallback: string) => (raw == null || raw === '' ? fallback : String(raw));

function parseCategoryNames(raw: any) {
  if (!Array.isArray(raw?.categories) || raw.categories.length === 0)
    throw new Error('Expected a non-empty "categories" array.');
  const categories = raw.categories.map(String);
  const dupCategory = categories.find((c: string, i: number) => categories.indexOf(c) !== i);
  if (dupCategory !== undefined) throw new Error(`Duplicate category ${JSON.stringify(dupCategory)}.`);
  return categories as string[];
}

function parseValues(s: any, where: string, count: number, index: number) {
  if (!Array.isArray(s?.values) || s.values.length !== count)
    throw new Error(`${where}: needs "values" with one number per category (${count}).`);
  return {
    id: idOf(s.id, `Series ${index + 1}`),
    color: typeof s.color === 'string' ? s.color : PALETTE[index % PALETTE.length]!,
    values: s.values.map((v: unknown, j: number) => {
      const n = num(v, `${where}.values[${j}]`);
      if (n < 0) throw new Error(`${where}.values[${j}]: expected a non-negative number, got ${n}`);
      return n;
    }),
  };
}

function parseCategories(raw: any) {
  const categories = parseCategoryNames(raw);
  if (!Array.isArray(raw.series) || raw.series.length === 0)
    throw new Error('Expected a non-empty "series" array.');
  const series = raw.series.map((s: any, i: number) => parseValues(s, `series[${i}]`, categories.length, i));
  const ids = series.map((s: { id: string }) => s.id);
  const dupId = ids.find((id: string, i: number) => id === 'category' || ids.indexOf(id) !== i);
  if (dupId !== undefined) throw new Error(`Series id ${JSON.stringify(dupId)} is duplicated or reserved.`);
  return { categories, series };
}

function parseCombo(raw: any) {
  const categories = parseCategoryNames(raw);
  const bars = parseValues(raw.bars, 'bars', categories.length, 0);
  const line = parseValues(raw.line, 'line', categories.length, 1);
  if (bars.id === line.id) throw new Error(`"bars" and "line" share the id ${JSON.stringify(bars.id)}.`);
  return { categories, bars, line };
}

function categoriesKind(
  chart: 'stacked-bar' | 'stacked-area' | 'radar',
  label: string,
  scaler: () => (value: number, seriesIndex: number) => number,
): Kind {
  return {
    label,
    hint: '{ categories: string[], series: [{ id, color?, values: number[] }] }. One non-negative value per category.',
    parse: raw => ({ chart, data: parseCategories(raw) }),
    nudge: parsed =>
      parsed.chart !== chart
        ? parsed
        : {
            chart,
            data: {
              ...parsed.data,
              series: (scale => parsed.data.series.map((s, i) => ({ ...s, values: s.values.map(v => scale(v, i)) })))(
                scaler(),
              ),
            },
          },
    sample: size => formatCategories(generateCategories(GALLERY_DATASETS[chart][size])),
  };
}

const byParity = (up: number, down: number) => (i: number) => (i % 2 ? down : up);

const alternating = (up: number, down: number) => {
  let rank = 0;
  return (value: number) => (value > 0 ? value * byParity(up, down)(rank++) : value);
};

function parseDonut(raw: any) {
  if (!Array.isArray(raw?.slices) || raw.slices.length === 0)
    throw new Error('Expected a non-empty "slices" array.');
  const slices = raw.slices.map((s: any, i: number) => {
    const where = `slices[${i}]`;
    const value = num(s?.value, `${where}.value`);
    if (value < 0) throw new Error(`${where}.value: expected a non-negative number, got ${value}`);
    return {
      id: idOf(s.id, `Slice ${i + 1}`),
      color: typeof s.color === 'string' ? s.color : PALETTE[i % PALETTE.length]!,
      value,
    };
  });
  const ids = slices.map((s: { id: string }) => s.id);
  const dupId = ids.find((id: string, i: number) => ids.indexOf(id) !== i);
  if (dupId !== undefined) throw new Error(`Duplicate slice id ${JSON.stringify(dupId)}.`);
  if (!slices.some((s: { value: number }) => s.value > 0))
    throw new Error('Slice values must not all be zero.');
  return { slices };
}

function parseLabels(raw: unknown, name: 'xs' | 'ys') {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`Expected a non-empty "${name}" array.`);
  const labels = raw.map(String);
  const dup = labels.find((l, i) => labels.indexOf(l) !== i);
  if (dup !== undefined) throw new Error(`Duplicate ${name} label ${JSON.stringify(dup)}.`);
  return labels;
}

function parseHeatmap(raw: any) {
  const xs = parseLabels(raw?.xs, 'xs');
  const ys = parseLabels(raw?.ys, 'ys');
  if (!Array.isArray(raw.values) || raw.values.length !== ys.length)
    throw new Error(`"values" needs one row per "ys" entry (${ys.length}).`);
  const values = raw.values.map((row: unknown, y: number) => {
    if (!Array.isArray(row) || row.length !== xs.length)
      throw new Error(`values[${y}]: needs one number per "xs" entry (${xs.length}).`);
    return row.map((v, x) => num(v, `values[${y}][${x}]`));
  });
  return { xs, ys, values };
}

const MAX_TREE_DEPTH = 8;

function parseTreemap(raw: any) {
  const seen = new Set<string>();
  const walk = (node: any, where: string, depth: number): TreeNode => {
    if (!node || typeof node !== 'object' || Array.isArray(node))
      throw new Error(`${where}: expected an object.`);
    if (node.id == null || node.id === '') throw new Error(`${where}: needs an "id".`);
    const id = String(node.id);
    if (seen.has(id)) throw new Error(`Duplicate node id ${JSON.stringify(id)}.`);
    seen.add(id);
    if (node.children === undefined) {
      const value = num(node.value, `${where}.value`);
      if (value <= 0) throw new Error(`${where}.value: expected a positive number, got ${value}`);
      return { id, value };
    }
    if (!Array.isArray(node.children) || node.children.length === 0)
      throw new Error(`${where}.children: expected a non-empty array.`);
    if (depth >= MAX_TREE_DEPTH) throw new Error(`Nesting deeper than ${MAX_TREE_DEPTH} levels.`);
    return {
      id,
      children: node.children.map((c: unknown, i: number) => walk(c, `${where}.children[${i}]`, depth + 1)),
    };
  };
  return walk(raw, 'root', 0);
}

const KINDS: { [K in ChartKind]?: Kind } = {
  survival: {
    label: 'Survival curve',
    hint: 'Array of { id, color?, points: [{ x, y, lower?, upper?, censored? }] }. y in 0..1.',
    parse: raw => ({ chart: 'survival', series: parsePoints('survival', raw) }),
    nudge: parsed =>
      parsed.chart !== 'survival'
        ? parsed
        : {
            chart: 'survival',
            series: parsed.series.map(s => ({
              ...s,
              points: s.points.map(p => ({
                ...p,
                y: p.y * 0.97,
                lower: p.lower * 0.97,
                upper: p.upper * 0.97,
              })),
            })),
          },
    sample: size => formatSeries(generateSurvival(DATASETS.survival[size])),
  },
  scatter: {
    label: 'Scatter',
    hint: 'Array of { id, color?, points: [{ x, y, size? }] }.',
    parse: raw => ({ chart: 'scatter', series: parsePoints('scatter', raw) }),
    nudge: parsed =>
      parsed.chart !== 'scatter'
        ? parsed
        : {
            chart: 'scatter',
            series: parsed.series.map(s => ({ ...s, points: s.points.map(p => ({ ...p, y: p.y + 1 })) })),
          },
    sample: size => formatSeries(generateScatter(DATASETS.scatter[size])),
  },
  'stacked-bar': categoriesKind('stacked-bar', 'Stacked bar', () => (v, i) => v * byParity(1.1, 0.9)(i)),
  'stacked-area': categoriesKind('stacked-area', 'Stacked area', () => (v, i) => v * byParity(1.1, 0.9)(i)),
  radar: categoriesKind('radar', 'Radar', () => alternating(1.2, 0.8)),
  combo: {
    label: 'Bar + line',
    hint: '{ categories: string[], bars: { id, color?, values }, line: { id, color?, values } }. Bars use the left axis, the line the right. Non-negative values.',
    parse: raw => ({ chart: 'combo', data: parseCombo(raw) }),
    nudge: parsed =>
      parsed.chart !== 'combo'
        ? parsed
        : {
            chart: 'combo',
            data: {
              ...parsed.data,
              bars: {
                ...parsed.data.bars,
                values: parsed.data.bars.values.map(alternating(1.3, 0.7)),
              },
              line: {
                ...parsed.data.line,
                values: parsed.data.line.values.map(alternating(0.7, 1.3)),
              },
            },
          },
    sample: size => formatCombo(generateCombo(GALLERY_DATASETS.combo[size])),
  },
  heatmap: {
    label: 'Heatmap',
    hint: '{ xs: string[], ys: string[], values: number[][] }. values[y][x]: one row per ys entry, row 0 on top, one number per xs entry.',
    parse: raw => ({ chart: 'heatmap', data: parseHeatmap(raw) }),
    nudge: parsed =>
      parsed.chart !== 'heatmap'
        ? parsed
        : {
            chart: 'heatmap',
            data: {
              ...parsed.data,
              values: (flat => {
                const constant = flat.every(v => v === flat[0]);
                let i = 0;
                return parsed.data.values.map(row =>
                  row.map(() => {
                    const k = i++;
                    return constant ? flat[k]! + (k % 2) : flat[(k + 1) % flat.length]!;
                  }),
                );
              })(parsed.data.values.flat()),
            },
          },
    sample: size => formatHeatmap(generateHeatmap(GALLERY_DATASETS.heatmap[size])),
  },
  treemap: {
    label: 'Treemap',
    hint: '{ id, children: [...] } nested to any depth up to 8. Every leaf needs a positive "value" and every id must be unique. A parent\'s own "value" is ignored: its size is the sum of its leaves.',
    parse: raw => ({ chart: 'treemap', data: parseTreemap(raw) }),
    nudge: parsed =>
      parsed.chart !== 'treemap'
        ? parsed
        : {
            chart: 'treemap',
            data: (values => {
              const constant = values.every(v => v === values[0]);
              let i = 0;
              const rotate = (node: TreeNode): TreeNode => {
                if (node.children) return { ...node, children: node.children.map(rotate) };
                const k = i++;
                return { ...node, value: constant ? values[k]! * (k % 2 ? 1.5 : 1) : values[(k + 1) % values.length]! };
              };
              return rotate(parsed.data);
            })(treeLeaves(parsed.data).map(l => l.value)),
          },
    sample: size => formatTreemap(generateTreemap(GALLERY_DATASETS.treemap[size])),
  },
  donut: {
    label: 'Donut',
    hint: '{ slices: [{ id, color?, value }] }. Non-negative values, at least one above zero.',
    parse: raw => ({ chart: 'donut', data: parseDonut(raw) }),
    nudge: parsed =>
      parsed.chart !== 'donut'
        ? parsed
        : {
            chart: 'donut',
            data: {
              slices: (scale => parsed.data.slices.map(s => ({ ...s, value: scale(s.value) })))(
                alternating(1.3, 0.7),
              ),
            },
          },
    sample: size => formatDonut(generateDonut(GALLERY_DATASETS.donut[size])),
  },
};

export const kinds = Object.keys(KINDS) as ChartKind[];
export const kindInfo = (chart: ChartKind) => KINDS[chart]!;
export const isGallery = (chart: ChartKind): chart is GalleryKind =>
  chart !== 'survival' && chart !== 'scatter';

/** Validates pasted JSON against the chart contract and fills optional fields. Throws a readable message. */
export const parseSeries = (chart: ChartKind, text: string) => KINDS[chart]!.parse(JSON.parse(text));
/** Same shape and ids, shifted values, so SVG libraries reconcile instead of remounting. */
export const nudge = (parsed: Parsed) => KINDS[parsed.chart]!.nudge(parsed);
export const sample = (chart: ChartKind, size: DatasetSize) => KINDS[chart]!.sample(size);
