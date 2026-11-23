import { useMemo } from 'react';
import { arcs } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO } from '../../shared/donut';
import { Plot } from '../shared';
import type { PlotOptions } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'donut'>) {
  const options = useMemo<PlotOptions>(
    () => ({
      width,
      height,
      margin: MARGIN,
      frame: 'polar',
      marks: [
        arcs({
          values: data.slices.map(s => s.value),
          colors: data.slices.map(s => s.color),
          labels: data.slices.map(s => s.id),
          inner: INNER_RATIO,
        }),
      ],
    }),
    [data, width, height],
  );
  const tip = useMemo<TooltipOptions>(
    () => ({ mode: 'nearest', text: (label, _x, _y, row = 0) => `${label}: ${data.slices[row]?.value}` }),
    [data],
  );
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
