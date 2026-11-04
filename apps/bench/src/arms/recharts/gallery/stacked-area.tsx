import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { CHART_MARGIN, TICK } from '../shared/style';

function Chart({ width, height, data }: GalleryChartProps<'stacked-area'>) {
  const rows = useMemo(
    () =>
      data.categories.map((category, i) => ({
        category,
        ...Object.fromEntries(data.series.map((s, j) => [`v${j}`, s.values[i]])),
      })),
    [data],
  );
  return (
    <AreaChart width={width} height={height} margin={CHART_MARGIN} data={rows}>
      <CartesianGrid vertical={false} stroke="#eee" />
      <XAxis dataKey="category" height={MARGIN.bottom} tick={TICK} />
      <YAxis width={MARGIN.left} tick={TICK} />
      <Tooltip isAnimationActive={false} />
      {data.series.map((s, j) => (
        <Area
          key={s.id}
          name={s.id}
          dataKey={`v${j}`}
          stackId="total"
          type="linear"
          stroke={s.color}
          fill={s.color}
          fillOpacity={1}
          dot={false}
          isAnimationActive={false}
        />
      ))}
    </AreaChart>
  );
}

export default { settleMode: 'raf' as const, Chart };
