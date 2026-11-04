import { areaY, defineChart, stack } from '@tanstack/charts';
import { Chart as TanChart } from '@tanstack/charts/react';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scalePoint } from '@tanstack/charts/scales/point';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';

function Chart({ width, height, data }: GalleryChartProps<'stacked-area'>) {
  const definition = useMemo(() => {
    const ids = data.series.map(s => s.id);
    const rows = data.series.flatMap(s =>
      data.categories.map((category, i) => ({ category, series: s.id, value: s.values[i]! })),
    );
    return defineChart({
      marks: [
        areaY(rows, {
          x: 'category',
          y: 'value',
          color: 'series',
          fillOpacity: 1,
          layout: stack({ order: ids }),
        }),
      ],
      scales: {
        x: { scale: () => scalePoint<string>().domain(data.categories) },
        y: { scale: scaleLinear, nice: true, grid: true },
      },
      color: { domain: ids, range: data.series.map(s => s.color) },
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return <TanChart definition={definition} width={width} height={height} ariaLabel="Stacked area chart" />;
}

export default { settleMode: 'raf' as const, Chart };
