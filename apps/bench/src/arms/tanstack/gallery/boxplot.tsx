import { barY, defineChart, dot, link, tickY } from '@tanstack/charts';
import { Chart as TanChart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  BOX_OUTLIER_COLOR,
  BOX_OUTLIER_RADIUS,
  BOX_STROKE,
  BOX_STROKE_WIDTH,
  boxPaddingInner,
  boxPaddingOuter,
  boxplotStats,
  boxScale,
} from '../../shared/boxplot';
import { thinTicks } from '../../shared/ticks';

function Chart({ width, height, data }: GalleryChartProps<'boxplot'>) {
  const definition = useMemo(() => {
    const stats = boxplotStats(data);
    const ids = stats.map(s => s.id);
    const { domain, ticks } = boxScale(stats);
    const outliers = stats.flatMap(s => s.outliers.map((value, i) => ({ id: s.id, value, key: `${s.id}:${i}` })));
    const stroke = { stroke: BOX_STROKE, strokeWidth: BOX_STROKE_WIDTH };
    return defineChart({
      marks: [
        link(stats, { x1: 'id', y1: 'whiskerLow', x2: 'id', y2: 'whiskerHigh', ...stroke }),
        barY(stats, { x: 'id', y1: 'q1', y2: 'q3', fill: s => s.color, ...stroke }),
        tickY(stats, { x: 'id', y: 'whiskerLow', ...stroke }),
        tickY(stats, { x: 'id', y: 'whiskerHigh', ...stroke }),
        tickY(stats, { x: 'id', y: 'median', ...stroke }),
        dot(outliers, { x: 'id', y: 'value', key: 'key', r: BOX_OUTLIER_RADIUS, fill: BOX_OUTLIER_COLOR }),
      ],
      scales: {
        x: {
          scale: () =>
            scaleBand<string>().domain(ids).paddingInner(boxPaddingInner).paddingOuter(boxPaddingOuter),
          axis: { ticks: { values: thinTicks(ids) } },
        },
        y: { scale: scaleLinear().domain(domain), grid: true, axis: { ticks: { values: ticks } } },
      },
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return <TanChart definition={definition} width={width} height={height} ariaLabel="Box plot" />;
}

export default { settleMode: 'raf' as const, Chart };
