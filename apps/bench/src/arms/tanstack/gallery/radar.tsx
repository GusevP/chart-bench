import { defineChart } from '@tanstack/charts';
import { angleGrid, polar, radialArea, radialGrid } from '@tanstack/charts/polar';
import { Chart as TanChart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { tooltip } from '@tanstack/charts/tooltip';
import { curveLinearClosed } from 'd3-shape';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_STROKE_WIDTH,
  radarMax,
  radarRings,
} from '../../shared/radar';

function Chart({ width, height, data }: GalleryChartProps<'radar'>) {
  const definition = useMemo(() => {
    const ids = data.series.map(s => s.id);
    const max = radarMax(data);
    const colorOf = new Map(data.series.map(s => [s.id, s.color]));
    const rows = data.series.flatMap((s, j) =>
      data.categories.map((category, i) => ({ category, series: s.id, value: s.values[i]!, key: `${j}:${i}` })),
    );
    return defineChart({
      marks: [
        polar({
          radiusRatio: 1,
          scales: {
            angle: { scale: scalePoint<string>().domain(data.categories), wrap: true },
            radius: { scale: scaleLinear().domain([0, max]) },
          },
          guides: [
            radialGrid({
              values: radarRings(max),
              shape: 'polygon',
              stroke: RADAR_GRID_COLOR,
              strokeWidth: 1,
            }),
            angleGrid({ labels: false, stroke: RADAR_GRID_COLOR, strokeWidth: 1 }),
          ],
          marks: [
            radialArea(rows, {
              angle: 'category',
              radius: 'value',
              color: 'series',
              key: 'key',
              z: 'series',
              curve: curveLinearClosed,
              fillOpacity: RADAR_FILL_OPACITY,
              stroke: d => colorOf.get(d.series)!,
              strokeWidth: RADAR_STROKE_WIDTH,
            }),
          ],
        }),
      ],
      scales: { x: null, y: null },
      color: { domain: ids, range: data.series.map(s => s.color) },
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return <TanChart definition={definition} width={width} height={height} ariaLabel="Radar chart" />;
}

export default { settleMode: 'raf' as const, Chart };
