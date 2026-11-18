import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_RINGS,
  RADAR_STROKE_WIDTH,
  radarMax,
} from '../../shared/radar';
import { Plot, baseLayout, withAlpha } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

const grid = { gridcolor: RADAR_GRID_COLOR, linecolor: RADAR_GRID_COLOR, showticklabels: false, ticks: '' } as const;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'radar'>) {
  const figure = useMemo((): Figure => {
    const max = radarMax(data);
    const theta = [...data.categories, data.categories[0]!];
    return {
      data: data.series.map(s => ({
        type: 'scatterpolar',
        mode: 'lines',
        name: s.id,
        r: [...s.values, s.values[0]!],
        theta,
        fill: 'toself',
        fillcolor: withAlpha(s.color, RADAR_FILL_OPACITY),
        line: { color: s.color, width: RADAR_STROKE_WIDTH },
        hoveron: 'points',
        hovertemplate: '%{theta}: %{r}',
      })),
      layout: {
        ...baseLayout(width, height),
        hovermode: 'closest',
        polar: {
          gridshape: 'linear',
          bgcolor: 'rgba(0,0,0,0)',
          radialaxis: { ...grid, range: [0, max], dtick: max / RADAR_RINGS, showline: false },
          angularaxis: { ...grid, type: 'category', rotation: 90, direction: 'clockwise', showline: true },
        },
      },
    };
  }, [data, width, height]);
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
