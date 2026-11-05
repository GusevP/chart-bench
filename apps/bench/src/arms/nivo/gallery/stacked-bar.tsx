import { Bar } from '@nivo/bar';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { thinTicks } from '../../shared/ticks';

function Chart({ width, height, data }: GalleryChartProps<'stacked-bar'>) {
  const rows = useMemo(
    () =>
      data.categories.map((category, i) => ({
        category,
        ...Object.fromEntries(data.series.map(s => [s.id, s.values[i]])),
      })),
    [data],
  );
  const colorById = useMemo(() => new Map(data.series.map(s => [s.id, s.color])), [data]);
  return (
    <Bar
      width={width}
      height={height}
      margin={MARGIN}
      data={rows}
      keys={data.series.map(s => s.id)}
      indexBy="category"
      animate={EFFECTS}
      enableLabel={false}
      colors={({ id }) => colorById.get(String(id)) ?? 'black'}
      axisBottom={{ tickValues: thinTicks(data.categories) }}
    />
  );
}

export default { settleMode: 'raf' as const, Chart };
