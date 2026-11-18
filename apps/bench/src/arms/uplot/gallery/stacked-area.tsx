import { useMemo } from 'react';
import type uPlot from 'uplot';

import type { GalleryChartProps } from '../../../data/contract';
import { UPlot, base, categoryAxis, categoryTip, cursor, fromZero, stacked, valueAxis } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const plotData = useMemo<uPlot.AlignedData>(
    () => [data.categories.map((_, i) => i), ...stacked(data.series).reverse()],
    [data],
  );
  const options = useMemo<uPlot.Options>(
    () => ({
      ...base,
      width,
      height,
      scales: { x: { time: false, range: [0, Math.max(1, data.categories.length - 1)] }, y: { range: fromZero } },
      axes: [categoryAxis(data.categories), valueAxis],
      series: [
        {},
        ...[...data.series].reverse().map(s => ({
          label: s.id,
          stroke: s.color,
          fill: s.color,
          width: 1,
          points: { show: false },
        })),
      ],
      cursor,
      plugins: [categoryTip(data.categories, data.series)],
    }),
    [data, width, height],
  );

  return <UPlot options={options} data={plotData} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
