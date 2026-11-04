import type { ChartKind, GalleryKind, Payload } from '../data/contract';
import { DATASETS, PALETTE, generateScatter, generateSurvival } from '../data/generate';
import type { DatasetSize } from '../data/generate';

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
