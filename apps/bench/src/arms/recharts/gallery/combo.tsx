import { useMemo } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from 'recharts';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH } from '../../shared/combo';
import { CHART_MARGIN, TICK } from '../shared/style';

function Chart({ width, height, data }: GalleryChartProps<'combo'>) {
  const rows = useMemo(
    () =>
      data.categories.map((category, i) => ({
        category,
        bar: data.bars.values[i],
        line: data.line.values[i],
      })),
    [data],
  );
  return (
    <ComposedChart width={width} height={height} margin={{ ...CHART_MARGIN, right: 0 }} data={rows}>
      <CartesianGrid vertical={false} stroke="#eee" />
      <XAxis dataKey="category" height={MARGIN.bottom} tick={TICK} />
      <YAxis yAxisId="bars" width={MARGIN.left} tick={TICK} domain={[0, 'auto']} />
      <YAxis yAxisId="line" orientation="right" width={MARGIN.left} tick={TICK} domain={[0, 'auto']} />
      <Tooltip isAnimationActive={false} />
      <Bar yAxisId="bars" name={data.bars.id} dataKey="bar" fill={data.bars.color} isAnimationActive={false} />
      <Line
        yAxisId="line"
        name={data.line.id}
        dataKey="line"
        type="linear"
        stroke={data.line.color}
        strokeWidth={COMBO_LINE_WIDTH}
        dot={false}
        activeDot={false}
        isAnimationActive={false}
      />
    </ComposedChart>
  );
}

export default { settleMode: 'raf' as const, Chart };
