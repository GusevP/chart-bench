import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';

const CHART_MARGIN = { top: MARGIN.top, right: MARGIN.right, left: 0, bottom: 0 };
const TICK = { fontSize: 11 };

function Chart({ width, height, data }: GalleryChartProps<'stacked-bar'>) {
  const rows = useMemo(
    () =>
      data.categories.map((category, i) => ({
        category,
        ...Object.fromEntries(data.series.map((s, j) => [`v${j}`, s.values[i]])),
      })),
    [data],
  );
  return (
    <BarChart width={width} height={height} margin={CHART_MARGIN} data={rows}>
      <CartesianGrid vertical={false} stroke="#eee" />
      <XAxis dataKey="category" height={MARGIN.bottom} tick={TICK} />
      <YAxis width={MARGIN.left} tick={TICK} />
      <Tooltip isAnimationActive={false} />
      {data.series.map((s, j) => (
        <Bar key={s.id} name={s.id} dataKey={`v${j}`} stackId="total" fill={s.color} isAnimationActive={false} />
      ))}
    </BarChart>
  );
}

export default { settleMode: 'raf' as const, Chart };
