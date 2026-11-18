import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { Plot, axis, baseLayout, categoryAxis } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const figure = useMemo(
    (): Figure => ({
      data: [
        {
          type: 'bar',
          name: data.bars.id,
          x: data.categories,
          y: data.bars.values,
          marker: { color: data.bars.color, line: { width: 0 } },
        },
        {
          type: 'scatter',
          mode: 'lines',
          name: data.line.id,
          x: data.categories,
          y: data.line.values,
          yaxis: 'y2',
          line: { color: data.line.color, width: COMBO_LINE_WIDTH },
        },
      ],
      layout: {
        ...baseLayout(width, height, { right: COMBO_RIGHT }),
        bargap: 0.2,
        hovermode: 'x unified',
        xaxis: categoryAxis(data.categories),
        yaxis: { ...axis, rangemode: 'tozero' },
        yaxis2: { ...axis, rangemode: 'tozero', overlaying: 'y', side: 'right', showgrid: false, tickmode: 'auto' },
      },
    }),
    [data, width, height],
  );
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
