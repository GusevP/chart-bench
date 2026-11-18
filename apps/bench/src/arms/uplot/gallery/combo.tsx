import { useMemo } from 'react';
import uPlot from 'uplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { UPlot, base, categoryAxis, categoryTip, cursor, fromZero, valueAxis } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const plotData = useMemo<uPlot.AlignedData>(
    () => [data.categories.map((_, i) => i), data.bars.values, data.line.values],
    [data],
  );
  const options = useMemo<uPlot.Options>(
    () => ({
      ...base,
      padding: [MARGIN.top, 0, 0, 0],
      width,
      height,
      scales: {
        x: { time: false, range: [-0.5, data.categories.length - 0.5] },
        y: { range: fromZero },
        right: { range: fromZero },
      },
      axes: [
        categoryAxis(data.categories),
        valueAxis,
        { scale: 'right', side: 1, size: COMBO_RIGHT, grid: { show: false } },
      ],
      series: [
        {},
        {
          label: data.bars.id,
          fill: data.bars.color,
          width: 0,
          paths: uPlot.paths.bars!({ size: [0.8] }),
          points: { show: false },
        },
        {
          label: data.line.id,
          scale: 'right',
          stroke: data.line.color,
          width: COMBO_LINE_WIDTH,
          points: { show: false },
        },
      ],
      cursor,
      plugins: [categoryTip(data.categories, [data.bars, data.line])],
    }),
    [data, width, height],
  );

  return <UPlot options={options} data={plotData} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
