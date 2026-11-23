import { useMemo } from 'react';
import { band, bar } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { Plot, places } from '../shared';
import type { PlotOptions } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-bar'>) {
  const options = useMemo<PlotOptions>(() => {
    const x = places(data.categories.length);
    return {
      width,
      height,
      margin: MARGIN,
      x: band({ label: '', categories: data.categories }),
      y: { domain: 'nice', label: '' },
      marks: data.series.map(s => bar({ x, y: s.values, stack: 'series', color: s.color, label: s.id })),
    };
  }, [data, width, height]);
  const tip = useMemo<TooltipOptions>(
    () => ({ mode: 'nearest', text: (label, _x, y, row = 0) => `${data.categories[row]} · ${label}: ${y}` }),
    [data],
  );
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
