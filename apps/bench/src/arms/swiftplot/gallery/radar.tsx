import { useMemo } from 'react';
import { radar } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { RADAR_FILL_OPACITY, radarMax } from '../../shared/radar';
import { Plot } from '../shared';
import type { PlotOptions } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'radar'>) {
  const options = useMemo<PlotOptions>(
    () => ({
      width,
      height,
      margin: MARGIN,
      frame: 'polar',
      marks: radar({
        axes: data.categories,
        series: data.series.map(s => ({ values: s.values, color: s.color, label: s.id })),
        max: radarMax(data),
        fill: RADAR_FILL_OPACITY,
      }),
    }),
    [data, width, height],
  );
  const tip = useMemo<TooltipOptions>(() => {
    const values = new Map(data.series.map(s => [s.id, s.values]));
    return {
      mode: 'nearest',
      text: (label, _x, _y, row = 0) => `${data.categories[row]} · ${label}: ${values.get(label)?.[row]}`,
    };
  }, [data]);
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
