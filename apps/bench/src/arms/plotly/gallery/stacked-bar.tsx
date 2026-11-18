import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { Plot, axis, baseLayout, categoryAxis } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-bar'>) {
  const figure = useMemo(
    (): Figure => ({
      data: data.series.map(s => ({
        type: 'bar',
        name: s.id,
        x: data.categories,
        y: s.values,
        marker: { color: s.color, line: { width: 0 } },
        hovertemplate: '%{y}',
      })),
      layout: {
        ...baseLayout(width, height),
        barmode: 'stack',
        bargap: 0.2,
        hovermode: 'x unified',
        xaxis: categoryAxis(data.categories),
        yaxis: axis,
      },
    }),
    [data, width, height],
  );
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
