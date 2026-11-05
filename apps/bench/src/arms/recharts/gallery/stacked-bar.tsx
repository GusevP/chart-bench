import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { CHART_MARGIN, TICK } from '../shared/style';

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
      <Tooltip isAnimationActive={EFFECTS} />
      {data.series.map((s, j) => (
        <Bar key={s.id} name={s.id} dataKey={`v${j}`} stackId="total" fill={s.color} activeBar={EFFECTS && { fillOpacity: 0.7 }} isAnimationActive={EFFECTS} />
      ))}
    </BarChart>
  );
}

export default { settleMode: 'raf' as const, Chart };
