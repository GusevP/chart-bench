import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { HEAT_RANGE, heatmapDomain } from '../../shared/colorRamp';
import { Plot, baseLayout, categoryAxis } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'heatmap'>) {
  const figure = useMemo((): Figure => {
    const [lo, hi] = heatmapDomain(data.values);
    return {
      data: [
        {
          type: 'heatmap',
          x: data.xs,
          y: data.ys,
          z: data.values,
          zmin: lo === hi ? lo - 1 : lo,
          zmax: lo === hi ? hi + 1 : hi,
          colorscale: [
            [0, HEAT_RANGE[0]],
            [1, HEAT_RANGE[1]],
          ],
          showscale: false,
          hovertemplate: '%{y} / %{x}: %{z}<extra></extra>',
        },
      ],
      layout: {
        ...baseLayout(width, height),
        hovermode: 'closest',
        xaxis: categoryAxis(data.xs),
        yaxis: { ...categoryAxis(data.ys), autorange: 'reversed' },
      },
    };
  }, [data, width, height]);
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
