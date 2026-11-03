import type { ScatterSeries, SurvivalSeries } from '../data/contract';
import { PALETTE } from '../data/generate';
import type { ChartKind } from '../data/generate';

export type Parsed =
  { chart: 'survival'; series: SurvivalSeries[] } | { chart: 'scatter'; series: ScatterSeries[] };

const num = (v: unknown, where: string) => {
  if (typeof v !== 'number' || !Number.isFinite(v))
    throw new Error(`${where}: expected a number, got ${JSON.stringify(v)}`);
  return v;
};

/** Validates pasted JSON against the chart contract and fills optional fields. Throws a readable message. */
export function parseSeries(chart: ChartKind, text: string): Parsed {
  const raw: unknown = JSON.parse(text);
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('Expected a non-empty array of series.');
  const series = raw.map((s: any, i) => {
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
  return { chart, series } as Parsed;
}

/** One point per line: readable as a format example, and still small for heavy samples. */
export function formatSeries(series: { id: string; color: string; points: object[] }[]) {
  const block = (s: (typeof series)[number]) =>
    `  {"id": ${JSON.stringify(s.id)}, "color": ${JSON.stringify(s.color)}, "points": [\n` +
    s.points.map(p => `    ${JSON.stringify(p)}`).join(',\n') +
    '\n  ]}';
  return `[\n${series.map(block).join(',\n')}\n]`;
}
