import { barY, defineChart, lineY } from '@tanstack/charts';
import { Chart as TanChart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { thinTicks } from '../../shared/ticks';

function Chart({ width, height, data }: GalleryChartProps<'combo'>) {
  const definition = useMemo(() => {
    const bars = data.categories.map((category, i) => ({ category, value: data.bars.values[i]! }));
    const line = data.categories.map((category, i) => ({ category, value: data.line.values[i]! }));
    return defineChart({
      marks: [
        barY(bars, { x: 'category', y: 'value', fill: data.bars.color }),
        lineY(line, {
          x: 'category',
          y: 'value',
          yScale: 'line',
          stroke: data.line.color,
          strokeWidth: COMBO_LINE_WIDTH,
        }),
      ],
      scales: {
        x: {
          scale: () => scaleBand<string>().domain(data.categories).padding(0.2),
          axis: { ticks: { values: thinTicks(data.categories) } },
        },
        y: { scale: scaleLinear().domain([0, Math.max(...data.bars.values) || 1]), nice: true, grid: true },
        line: {
          channel: 'y',
          scale: scaleLinear().domain([0, Math.max(...data.line.values) || 1]),
          nice: true,
          side: 'right',
        },
      },
      margin: { ...MARGIN, right: COMBO_RIGHT },
      tooltip,
    });
  }, [data]);

  return <TanChart definition={definition} width={width} height={height} ariaLabel="Bar and line chart" />;
}

export default { settleMode: 'raf' as const, Chart };
