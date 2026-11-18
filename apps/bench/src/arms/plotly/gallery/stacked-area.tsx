import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { Plot, axis, baseLayout, categoryAxis } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const figure = useMemo(
    (): Figure => ({
      data: data.series.map(s => ({
        type: 'scatter',
        mode: 'lines',
        stackgroup: 'one',
        name: s.id,
        x: data.categories,
        y: s.values,
        line: { color: s.color, width: 1 },
        fillcolor: s.color,
        hovertemplate: '%{y}',
      })),
      layout: {
        ...baseLayout(width, height),
        hovermode: 'x unified',
        xaxis: { ...categoryAxis(data.categories), range: [0, data.categories.length - 1] },
        yaxis: axis,
      },
    }),
    [data, width, height],
  );
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
