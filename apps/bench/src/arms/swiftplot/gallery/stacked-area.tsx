import { useMemo } from 'react';
import { area, band } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { Plot, places } from '../shared';
import type { PlotOptions } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const options = useMemo<PlotOptions>(() => {
    const x = places(data.categories.length);
    return {
      width,
      height,
      margin: MARGIN,
      x: band({ label: '', categories: data.categories }),
      y: { domain: 'nice', label: '' },
      marks: data.series.map(s =>
        area({ x, y: s.values, stack: 'series', color: s.color, alpha: 1, label: s.id }),
      ),
    };
  }, [data, width, height]);
  const tip = useMemo<TooltipOptions>(
    () => ({
      mode: 'x',
      title: x => data.categories[Math.round(x)] ?? '',
      value: y => String(Math.round(y * 10) / 10),
    }),
    [data],
  );
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
