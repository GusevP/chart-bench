import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import {
  BOX_OUTLIER_COLOR,
  BOX_OUTLIER_RADIUS,
  BOX_RATIO,
  BOX_STROKE,
  BOX_STROKE_WIDTH,
  niceScale,
} from '../../shared/boxplot';
import { Plot, axis, baseLayout, categoryAxis } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'boxplot'>) {
  const figure = useMemo((): Figure => {
    const all = data.groups.flatMap(g => g.values);
    const { domain, step } = niceScale(Math.min(...all), Math.max(...all));
    return {
      data: data.groups.map(g => ({
        type: 'box',
        name: g.id,
        y: g.values,
        boxpoints: 'outliers',
        fillcolor: g.color,
        line: { color: BOX_STROKE, width: BOX_STROKE_WIDTH },
        marker: { color: BOX_OUTLIER_COLOR, size: BOX_OUTLIER_RADIUS * 2, line: { width: 0 } },
      })),
      layout: {
        ...baseLayout(width, height),
        boxmode: 'overlay',
        boxgap: 1 - BOX_RATIO,
        boxgroupgap: 0,
        hovermode: 'x',
        xaxis: categoryAxis(data.groups.map(g => g.id)),
        yaxis: { ...axis, range: domain, dtick: step },
      },
    };
  }, [data, width, height]);
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
