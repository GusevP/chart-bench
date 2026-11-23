import { useMemo } from 'react';
import { band, heatmap, sequential } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { HEAT_RANGE } from '../../shared/colorRamp';
import { Plot } from '../shared';
import type { PlotOptions } from '../shared';

const hex = (rgb: string) =>
  '#' + [...rgb.matchAll(/\d+/g)].map(([n]) => Number(n).toString(16).padStart(2, '0')).join('');
const color = sequential({ stops: HEAT_RANGE.map(hex) });

function Chart({ width, height, data, onSettled }: GalleryChartProps<'heatmap'>) {
  const columns = data.xs.length;
  const rows = data.ys.length;
  const options = useMemo<PlotOptions>(() => {
    // heatmap() puts row 0 at the bottom; the data's first row is the top one.
    const values = new Float64Array(rows * columns);
    data.values.forEach((row, j) => values.set(row, (rows - 1 - j) * columns));
    return {
      width,
      height,
      margin: MARGIN,
      x: band({ label: '', categories: data.xs }),
      y: band({ label: '', categories: [...data.ys].reverse() }),
      marks: [heatmap({ values, columns, color })],
    };
  }, [data, width, height, columns, rows]);
  const tip = useMemo<TooltipOptions>(
    () => ({
      mode: 'nearest',
      text: (_label, x, y) => {
        const i = Math.round(x);
        const j = rows - 1 - Math.round(y);
        return `${data.ys[j]} / ${data.xs[i]}: ${data.values[j]?.[i]}`;
      },
    }),
    [data, rows],
  );
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
