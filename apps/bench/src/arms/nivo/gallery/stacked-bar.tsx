import { Bar } from '@nivo/bar';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';

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
      animate={false}
      enableLabel={false}
      colors={({ id }) => colorById.get(String(id)) ?? 'black'}
      axisBottom={{ tickRotation: 0 }}
    />
  );
}

export default { settleMode: 'raf' as const, Chart };
