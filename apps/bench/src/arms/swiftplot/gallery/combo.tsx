import { useMemo } from 'react';
import { band, bands, bar, line } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { Plot, places } from '../shared';
import type { PlotOptions } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const options = useMemo<PlotOptions>(() => {
    const [x1, x2] = bands(data.categories.length);
    return {
      width,
      height,
      margin: { ...MARGIN, right: COMBO_RIGHT },
      x: band({ label: '', categories: data.categories }),
      y: { domain: 'nice', label: '' },
      y2: { domain: [0, Math.max(...data.line.values) || 1], label: '' },
      marks: [
        bar({ x1, x2, y: data.bars.values, color: data.bars.color, label: data.bars.id }),
        line({
          x: places(data.categories.length),
          y: data.line.values,
          yAxis: 'y2',
          color: data.line.color,
          width: COMBO_LINE_WIDTH,
          label: data.line.id,
        }),
      ],
    };
  }, [data, width, height]);
  const tip = useMemo<TooltipOptions>(
    () => ({
      mode: 'nearest',
      text: (label, x, y) => `${data.categories[Math.round(x)]} · ${label}: ${y}`,
    }),
    [data],
  );
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
