import { barY, defineChart, stack } from '@tanstack/charts';
import { Chart as TanChart } from '../shared/Chart';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { thinTicks } from '../../shared/ticks';

function Chart({ width, height, data }: GalleryChartProps<'stacked-bar'>) {
  const definition = useMemo(() => {
    const ids = data.series.map(s => s.id);
    const rows = data.series.flatMap(s =>
      data.categories.map((category, i) => ({ category, series: s.id, value: s.values[i]! })),
    );
    return defineChart({
      marks: [barY(rows, { x: 'category', y: 'value', color: 'series', layout: stack({ order: ids }) })],
      scales: {
        x: {
          scale: () => scaleBand<string>().domain(data.categories).padding(0.2),
          axis: { ticks: { values: thinTicks(data.categories) } },
        },
        y: { scale: scaleLinear, nice: true, grid: true },
      },
      color: { domain: ids, range: data.series.map(s => s.color) },
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return <TanChart definition={definition} width={width} height={height} ariaLabel="Stacked bar chart" />;
}

export default { settleMode: 'raf' as const, Chart };
