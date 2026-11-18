import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { INNER_RATIO } from '../../shared/donut';
import { Plot, baseLayout } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'donut'>) {
  const figure = useMemo(
    (): Figure => ({
      data: [
        {
          type: 'pie',
          hole: INNER_RATIO,
          sort: false,
          direction: 'clockwise',
          rotation: 0,
          textinfo: 'none',
          labels: data.slices.map(s => s.id),
          values: data.slices.map(s => s.value),
          marker: { colors: data.slices.map(s => s.color), line: { width: 0 } },
          hovertemplate: '%{label}: %{value}<extra></extra>',
        },
      ],
      layout: baseLayout(width, height),
    }),
    [data, width, height],
  );
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
