import { Line } from '@nivo/line';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { thinTicks } from '../shared/ticks';

function Chart({ width, height, data }: GalleryChartProps<'stacked-area'>) {
  const lines = useMemo(
    () =>
      data.series.map(s => ({
        id: s.id,
        data: data.categories.map((x, i) => ({ x, y: s.values[i]! })),
      })),
    [data],
  );
  const colorById = useMemo(() => new Map(data.series.map(s => [s.id, s.color])), [data]);
  return (
    <Line
      width={width}
      height={height}
      margin={MARGIN}
      data={lines}
      animate={false}
      xScale={{ type: 'point' }}
      yScale={{ type: 'linear', stacked: true, min: 0, max: 'auto' }}
      enableArea
      areaOpacity={1}
      enablePoints={false}
      enableGridX={false}
      colors={({ id }) => colorById.get(String(id)) ?? 'black'}
      axisBottom={{ tickValues: thinTicks(data.categories) }}
      useMesh
    />
  );
}

export default { settleMode: 'raf' as const, Chart };
