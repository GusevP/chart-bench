import { useMemo } from 'react';
import { Pie, PieChart, Tooltip } from 'recharts';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO, donutRadius } from '../../shared/donut';

function Chart({ width, height, data }: GalleryChartProps<'donut'>) {
  const rows = useMemo(() => data.slices.map(s => ({ id: s.id, value: s.value, fill: s.color })), [data]);
  const radius = donutRadius(width, height);
  return (
    <PieChart width={width} height={height} margin={MARGIN}>
      <Tooltip isAnimationActive={false} />
      <Pie
        data={rows}
        dataKey="value"
        nameKey="id"
        startAngle={90}
        endAngle={-270}
        innerRadius={radius * INNER_RATIO}
        outerRadius={radius}
        stroke="none"
        label={false}
        isAnimationActive={false}
      />
    </PieChart>
  );
}

export default { settleMode: 'raf' as const, Chart };
