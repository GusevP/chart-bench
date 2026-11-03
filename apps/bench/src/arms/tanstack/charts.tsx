import { areaY, d3Curve, defineChart, dot, lineY, tickX } from '@tanstack/charts';
import { decorative } from '@tanstack/charts/mark/decorative';
import { Chart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { bisector } from 'd3-array';
import { curveStepAfter } from 'd3-shape';
import { useMemo } from 'react';

import type {
  Arm,
  ScatterChartProps,
  ScatterPoint,
  SurvivalChartProps,
  SurvivalPoint,
} from '../../data/contract';
import { MARGIN } from '../../data/spec';

type SurvivalRow = SurvivalPoint & { series: string };
type ScatterRow = ScatterPoint & { series: string };

const stepAfter = d3Curve(curveStepAfter);
const byX = bisector((p: SurvivalPoint) => p.x).right;
const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 });

function Survival({ width, height, series }: SurvivalChartProps) {
  const definition = useMemo(() => {
    const rows: SurvivalRow[] = series.flatMap(s => s.points.map(p => ({ ...p, series: s.id })));
    const lastX = Math.max(...rows.map(r => r.x));

    return defineChart({
      marks: [
        decorative(
          areaY(rows, { x: 'x', y1: 'lower', y2: 'upper', z: 'series', fillOpacity: 0.15, curve: stepAfter }),
        ),
        lineY(rows, { x: 'x', y: 'y', z: 'series', curve: stepAfter }),
        decorative(
          tickX(
            rows.filter(r => r.censored),
            { x: 'x', y: 'y', z: 'series', length: 8 },
          ),
        ),
      ],
      scales: {
        x: { scale: scaleLinear().domain([0, lastX]), axis: { label: 'Days' } },
        y: { scale: scaleLinear().domain([0, 1]), grid: true, axis: { label: 'Survival' } },
      },
      color: { domain: series.map(s => s.id), range: series.map(s => s.color) },
      margin: MARGIN,
      focus: 'nearest-x',
      // Series have their own event times, so group-x would only list series with a point at that exact x.
      tooltip: {
        use: tooltip,
        content: points => {
          const x = Number(points[0]?.xValue ?? 0);
          return {
            title: `Day ${fmt.format(x)}`,
            rows: series.map(s => ({
              label: s.id,
              value: fmt.format(s.points[Math.max(0, byX(s.points, x) - 1)]?.y ?? 1),
              color: s.color,
            })),
          };
        },
      },
    });
  }, [series]);

  return <Chart definition={definition} width={width} height={height} ariaLabel="Survival curves" />;
}

function Scatter({ width, height, series }: ScatterChartProps) {
  const definition = useMemo(() => {
    const rows: ScatterRow[] = series.flatMap(s => s.points.map(p => ({ ...p, series: s.id })));
    return defineChart({
      marks: [dot(rows, { x: 'x', y: 'y', z: 'series', r: 'size', fillOpacity: 0.7 })],
      scales: {
        x: { scale: scaleLinear, nice: true, axis: { label: 'X' } },
        y: { scale: scaleLinear, nice: true, grid: true, axis: { label: 'Y' } },
      },
      color: { domain: series.map(s => s.id), range: series.map(s => s.color) },
      margin: MARGIN,
      tooltip,
    });
  }, [series]);

  return <Chart definition={definition} width={width} height={height} ariaLabel="Scatter plot" />;
}

export const arm: Arm = { settleMode: 'raf', Survival, Scatter };
