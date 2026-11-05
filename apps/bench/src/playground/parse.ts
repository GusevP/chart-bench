import { boxStats } from '../arms/shared/boxplot';
import { treeLeaves } from '../arms/shared/treemap';
import type { ChartKind, GalleryKind, Payload, Sankey, TreeNode } from '../data/contract';
import { DATASETS, PALETTE, generateScatter, generateSurvival } from '../data/generate';
import type { DatasetSize } from '../data/generate';
import {
  GALLERY_DATASETS,
  formatBoxplot,
  formatCandles,
  formatCategories,
  formatCombo,
  formatDonut,
  formatHeatmap,
  formatSankey,
  formatTreemap,
  generateBoxplot,
  generateCandles,
  generateCategories,
  generateCombo,
  generateDonut,
  generateHeatmap,
  generateSankey,
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

const colorOf = (raw: unknown, index: number) =>
  typeof raw === 'string' ? raw : PALETTE[index % PALETTE.length]!;

function assertUnique(items: string[], message: (quoted: string) => string, reserved?: string) {
  const dup = items.find((x, i) => x === reserved || items.indexOf(x) !== i);
  if (dup !== undefined) throw new Error(message(JSON.stringify(dup)));
}

function parseNames(raw: unknown, name: string, noun: string) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error(`Expected a non-empty "${name}" array.`);
  const names = raw.map(String);
  assertUnique(names, dup => `Duplicate ${noun} ${dup}.`);
  return names;
}

function parsePoints(chart: 'survival' | 'scatter', raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Expected a non-empty array of series.');
  return raw.map((s: any, i) => {
    const where = `series[${i}]`;
    if (!s || !Array.isArray(s.points) || s.points.length === 0)
      throw new Error(`${where}: needs a non-empty "points" array.`);
    const id = s.id == null ? `Series ${i + 1}` : String(s.id);
    const color = colorOf(s.color, i);
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

function parseValues(s: any, where: string, count: number, index: number) {
  if (!Array.isArray(s?.values) || s.values.length !== count)
    throw new Error(`${where}: needs "values" with one number per category (${count}).`);
  return {
    id: idOf(s.id, `Series ${index + 1}`),
    color: colorOf(s.color, index),
    values: s.values.map((v: unknown, j: number) => {
      const n = num(v, `${where}.values[${j}]`);
      if (n < 0) throw new Error(`${where}.values[${j}]: expected a non-negative number, got ${n}`);
      return n;
    }),
  };
}

function parseCategories(raw: any) {
  const categories = parseNames(raw?.categories, 'categories', 'category');
  if (!Array.isArray(raw.series) || raw.series.length === 0)
    throw new Error('Expected a non-empty "series" array.');
  const series = raw.series.map((s: any, i: number) => parseValues(s, `series[${i}]`, categories.length, i));
  assertUnique(
    series.map((s: { id: string }) => s.id),
    dup => `Series id ${dup} is duplicated or reserved.`,
    'category',
  );
  return { categories, series };
}

function parseCombo(raw: any) {
  const categories = parseNames(raw?.categories, 'categories', 'category');
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
      color: colorOf(s.color, i),
      value,
    };
  });
  assertUnique(
    slices.map((s: { id: string }) => s.id),
    dup => `Duplicate slice id ${dup}.`,
  );
  if (!slices.some((s: { value: number }) => s.value > 0))
    throw new Error('Slice values must not all be zero.');
  return { slices };
}

function parseHeatmap(raw: any) {
  const xs = parseNames(raw?.xs, 'xs', 'xs label');
  const ys = parseNames(raw?.ys, 'ys', 'ys label');
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

function parseBoxplot(raw: any) {
  if (!Array.isArray(raw?.groups) || raw.groups.length === 0) throw new Error('Expected a non-empty "groups" array.');
  const groups = raw.groups.map((g: any, i: number) => {
    const where = `groups[${i}]`;
    if (!Array.isArray(g?.values) || g.values.length === 0) throw new Error(`${where}: needs a non-empty "values" array.`);
    return {
      id: idOf(g.id, `Group ${i + 1}`),
      color: colorOf(g.color, i),
      values: g.values.map((v: unknown, j: number) => num(v, `${where}.values[${j}]`)),
    };
  });
  assertUnique(
    groups.map((g: { id: string }) => g.id),
    dup => `Duplicate group id ${dup}.`,
  );
  return { groups };
}

function parseCandles(raw: any) {
  if (!Array.isArray(raw?.candles) || raw.candles.length === 0)
    throw new Error('Expected a non-empty "candles" array.');
  const candles = raw.candles.map((c: any, i: number) => {
    const where = `candles[${i}]`;
    const t = c?.t;
    const ms = Date.parse(`${t}T00:00:00Z`);
    if (typeof t !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== t)
      throw new Error(`${where}.t: expected a date as YYYY-MM-DD, got ${JSON.stringify(t)}`);
    const [open, high, low, close] = (['open', 'high', 'low', 'close'] as const).map(k => num(c[k], `${where}.${k}`));
    if (low! > Math.min(open!, close!) || high! < Math.max(open!, close!))
      throw new Error(`${where}: needs low <= open, close <= high.`);
    return { t, open: open!, high: high!, low: low!, close: close! };
  });
  candles.sort((a: { t: string }, b: { t: string }) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
  const dup = candles.find((c: { t: string }, i: number) => i > 0 && candles[i - 1].t === c.t);
  if (dup) throw new Error(`Duplicate date ${dup.t}.`);
  if (candles.length < 2) throw new Error('Expected at least two candles.');
  return { candles };
}

function parseSankey(raw: any): Sankey {
  if (!Array.isArray(raw?.nodes) || raw.nodes.length === 0) throw new Error('Expected a non-empty "nodes" array.');
  if (!Array.isArray(raw.links) || raw.links.length === 0) throw new Error('Expected a non-empty "links" array.');
  const index = new Map<string, number>();
  const nodes = raw.nodes.map((n: any, i: number) => {
    if (n?.id == null || n.id === '') throw new Error(`nodes[${i}]: needs an "id".`);
    const id = String(n.id);
    if (index.has(id)) throw new Error(`Duplicate node id ${JSON.stringify(id)}.`);
    index.set(id, i);
    return { id };
  });
  const endpoint = (v: unknown, where: string) => {
    const id = v == null ? '' : String(v);
    if (!index.has(id)) throw new Error(`${where}: unknown node ${JSON.stringify(id)}.`);
    return id;
  };
  const links = raw.links.map((l: any, i: number) => {
    const where = `links[${i}]`;
    const source = endpoint(l?.source, `${where}.source`);
    const target = endpoint(l?.target, `${where}.target`);
    if (source === target) throw new Error(`${where}: a node cannot link to itself.`);
    const value = num(l.value, `${where}.value`);
    if (value <= 0) throw new Error(`${where}.value: expected a positive number, got ${value}`);
    return { source, target, value };
  });
  const out: number[][] = nodes.map(() => []);
  for (const l of links) out[index.get(l.source)!]!.push(index.get(l.target)!);
  const state = new Uint8Array(nodes.length);
  for (let root = 0; root < nodes.length; root++) {
    if (state[root]) continue;
    const stack = [{ node: root, next: 0 }];
    state[root] = 1;
    while (stack.length) {
      const top = stack[stack.length - 1]!;
      const edges = out[top.node]!;
      if (top.next === edges.length) {
        state[top.node] = 2;
        stack.pop();
        continue;
      }
      const to = edges[top.next++]!;
      if (state[to] === 1) throw new Error(`The links form a cycle through ${JSON.stringify(nodes[to].id)}.`);
      if (!state[to]) {
        state[to] = 1;
        stack.push({ node: to, next: 0 });
      }
    }
  }
  return { nodes, links };
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
  sankey: {
    label: 'Sankey',
    hint: '{ nodes: [{ id }], links: [{ source, target, value }] }. Unique node ids, links between known nodes with a positive value, no self-links and no cycles.',
    parse: raw => ({ chart: 'sankey', data: parseSankey(raw) }),
    nudge: parsed => {
      if (parsed.chart !== 'sankey') return parsed;
      const { nodes, links } = parsed.data;
      const constant = links.every(l => l.value === links[0]!.value);
      return {
        chart: 'sankey',
        data: {
          nodes,
          links: links.map((l, k) => ({
            ...l,
            value: constant ? l.value * (k % 2 ? 1.5 : 1) : links[(k + 1) % links.length]!.value,
          })),
        },
      };
    },
    sample: size => formatSankey(generateSankey(GALLERY_DATASETS.sankey[size])),
  },
  boxplot: {
    label: 'Box plot',
    hint: '{ groups: [{ id, color?, values: number[] }] }. Raw values: quartiles by linear interpolation, whiskers to the most extreme value within 1.5 IQR of the box, or the box edge if that value falls inside the box. Points beyond are outliers, drawn as dots in every library except nivo, which has no outlier layer.',
    parse: raw => ({ chart: 'boxplot', data: parseBoxplot(raw) }),
    nudge: parsed => {
      if (parsed.chart !== 'boxplot') return parsed;
      return {
        chart: 'boxplot',
        data: {
          groups: parsed.data.groups.map((g, k) => {
            const { min, max, median } = boxStats(g.values);
            return {
              ...g,
              values: g.values.map((v, i) => {
                if (min === max) return v + ((i + k) % 2);
                return v > min && v >= median ? v + (max - min) * 0.1 : v;
              }),
            };
          }),
        },
      };
    },
    sample: size => formatBoxplot(generateBoxplot(GALLERY_DATASETS.boxplot[size])),
  },
  candlestick: {
    label: 'Candlestick',
    hint: '{ candles: [{ t, open, high, low, close }] }. At least two candles. t is YYYY-MM-DD and unique; candles are sorted by date and drawn one per slot, with no gaps for missing days. Each needs low <= open, close <= high. Close at or above open is up.',
    parse: raw => ({ chart: 'candlestick', data: parseCandles(raw) }),
    nudge: parsed => {
      if (parsed.chart !== 'candlestick') return parsed;
      const { candles } = parsed.data;
      const lift = (Math.max(...candles.map(c => c.high)) - Math.min(...candles.map(c => c.low)) || 1) * 0.02;
      return {
        chart: 'candlestick',
        data: {
          candles: candles.map((c, i) => {
            const high = c.high + lift;
            if (i % 2 === 0) return { ...c, high };
            if (c.open === c.close) return { ...c, open: c.high, high };
            return { ...c, open: c.close, close: c.open, high };
          }),
        },
      };
    },
    sample: size => formatCandles(generateCandles(GALLERY_DATASETS.candlestick[size])),
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
