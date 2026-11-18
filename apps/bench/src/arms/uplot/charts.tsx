import { useMemo } from 'react';
import uPlot from 'uplot';

import type { Arm, ScatterChartProps, SurvivalChartProps } from '../../data/contract';
import { EFFECTS } from '../../data/effects';
import { MARGIN } from '../../data/spec';
import { UPlot, base, nice, tooltipPlugin } from './shared';

const LABEL = 14;
const axes = (xLabel: string, yLabel: string): uPlot.Axis[] => [
  { label: xLabel, labelSize: LABEL, size: MARGIN.bottom - LABEL, grid: { show: false } },
  { label: yLabel, labelSize: LABEL, size: MARGIN.left - LABEL },
];

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const data = useMemo(
    () =>
      uPlot.join(
        series.map(s => [
          s.points.map(p => p.x),
          s.points.map(p => p.y),
          s.points.map(p => p.lower),
          s.points.map(p => p.upper),
        ]),
      ),
    [series],
  );

  const options = useMemo<uPlot.Options>(() => {
    const stepAfter = uPlot.paths.stepped!({ align: 1 });
    const edge = { paths: stepAfter, width: 0, points: { show: false } };
    const lastX = Math.max(0, ...series.map(s => s.points.at(-1)?.x ?? 0));

    return {
      ...base,
      width,
      height,
      scales: { x: { time: false, range: [0, lastX] }, y: { range: [0, 1] } },
      axes: axes('Days', 'Survival'),
      series: [
        {},
        ...series.flatMap(s => [
          { label: s.id, stroke: s.color, width: 1.5, paths: stepAfter, points: { show: false } },
          edge,
          edge,
        ]),
      ],
      bands: series.map((s, i) => ({ series: [3 + 3 * i, 2 + 3 * i], fill: `${s.color}26` })),
      focus: { alpha: EFFECTS ? 0.3 : 1 },
      cursor: {
        y: false,
        drag: { x: false, y: false },
        points: { show: EFFECTS },
        focus: { prox: EFFECTS ? 30 : -1 },
        // uPlot snaps to the closest x; a step-after value is the last point at or before it.
        dataIdx: (u, si, idx, x) => {
          if (si === 0) return idx;
          const ys = u.data[si]!;
          let i = u.data[0][idx]! > x ? idx - 1 : idx;
          while (i > 0 && ys[i] == null) i--;
          return i < 0 ? null : i;
        },
      },
      hooks: {
        draw: [
          u => {
            const { ctx } = u;
            const h = 4 * uPlot.pxRatio;
            ctx.save();
            ctx.lineWidth = uPlot.pxRatio;
            for (const s of series) {
              ctx.strokeStyle = s.color;
              ctx.beginPath();
              for (const p of s.points) {
                if (!p.censored) continue;
                const cx = u.valToPos(p.x, 'x', true);
                const cy = u.valToPos(p.y, 'y', true);
                ctx.moveTo(cx, cy - h);
                ctx.lineTo(cx, cy + h);
              }
              ctx.stroke();
            }
            ctx.restore();
          },
        ],
      },
      plugins: [
        tooltipPlugin(u => ({
          left: u.cursor.left!,
          top: u.cursor.top!,
          rows: [
            { text: `Day ${Math.round(u.posToVal(u.cursor.left!, 'x'))}` },
            ...series.map((s, i) => {
              const idx = u.cursor.idxs![1 + 3 * i];
              const y = idx == null ? null : u.data[1 + 3 * i]![idx];
              return { text: `${s.id}: ${y == null ? '–' : y.toFixed(3)}`, color: s.color };
            }),
          ],
        })),
      ],
    };
  }, [series, width, height]);

  return <UPlot options={options} data={data} onSettled={onSettled} />;
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const data = useMemo(
    () =>
      // Mode 2 takes [null, [xs, ys, ...facets] per series]; uPlot's typings only describe mode 1.
      [
        null,
        ...series.map(s => [s.points.map(p => p.x), s.points.map(p => p.y), s.points.map(p => p.size)]),
      ] as unknown as uPlot.AlignedData,
    [series],
  );

  const options = useMemo<uPlot.Options>(() => {
    const drawCircles: uPlot.Series.PathBuilder = (u, si) => {
      const s = series[si - 1]!;
      const { ctx } = u;
      const path = new Path2D();
      for (const p of s.points) {
        const cx = u.valToPos(p.x, 'x', true);
        const cy = u.valToPos(p.y, 'y', true);
        const r = p.size * uPlot.pxRatio;
        path.moveTo(cx + r, cy);
        path.arc(cx, cy, r, 0, 2 * Math.PI);
      }
      ctx.fillStyle = `${s.color}b3`;
      ctx.fill(path);
      return null;
    };

    // ponytail: linear scan per mousemove (100k points is ~1 ms); uPlot's scatter demo uses a quadtree.
    let hit: { si: number; i: number } | null = null;
    const nearest = (u: uPlot) => {
      const { left, top } = u.cursor;
      let best = Infinity;
      hit = null;
      series.forEach((s, k) => {
        s.points.forEach((p, i) => {
          const d = (u.valToPos(p.x, 'x') - left!) ** 2 + (u.valToPos(p.y, 'y') - top!) ** 2;
          if (d < best) [best, hit] = [d, { si: k + 1, i }];
        });
      });
    };
    return {
      ...base,
      mode: 2,
      width,
      height,
      scales: { x: { time: false, range: nice }, y: { range: nice } },
      axes: axes('X', 'Y'),
      series: [
        {},
        ...series.map(s => ({
          label: s.id,
          facets: [
            { scale: 'x', auto: true },
            { scale: 'y', auto: true },
          ],
          paths: drawCircles,
          points: { show: false },
        })),
      ],
      cursor: {
        x: false,
        y: false,
        drag: { x: false, y: false },
        points: { show: false },
        dataIdx: (u, si) => {
          if (si === 1) nearest(u);
          return hit?.si === si ? hit.i : null;
        },
      },
      plugins: [
        tooltipPlugin(u => {
          if (!hit) return null;
          const s = series[hit.si - 1]!;
          const p = s.points[hit.i]!;
          return {
            left: u.valToPos(p.x, 'x'),
            top: u.valToPos(p.y, 'y'),
            rows: [{ text: `${s.id}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`, color: s.color }],
          };
        }),
      ],
    };
  }, [series, width, height]);

  return <UPlot options={options} data={data} onSettled={onSettled} />;
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
