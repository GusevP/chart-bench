import { useMemo } from 'react';
import uPlot from 'uplot';

import type { GalleryChartProps } from '../../../data/contract';
import { UPlot, base, categoryAxis, categoryTip, cursor, fromZero, stacked, valueAxis } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-bar'>) {
  const plotData = useMemo<uPlot.AlignedData>(
    () => [data.categories.map((_, i) => i), ...stacked(data.series).reverse()],
    [data],
  );
  const options = useMemo<uPlot.Options>(() => {
    const bars = uPlot.paths.bars!({ size: [0.8] });
    return {
      ...base,
      width,
      height,
      scales: { x: { time: false, range: [-0.5, data.categories.length - 0.5] }, y: { range: fromZero } },
      axes: [categoryAxis(data.categories), valueAxis],
      // Topmost layer first: each cumulative bar is painted over by the shorter ones below it.
      series: [
        {},
        ...[...data.series].reverse().map(s => ({
          label: s.id,
          fill: s.color,
          width: 0,
          paths: bars,
          points: { show: false },
        })),
      ],
      cursor,
      plugins: [categoryTip(data.categories, data.series)],
    };
  }, [data, width, height]);

  return <UPlot options={options} data={plotData} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
