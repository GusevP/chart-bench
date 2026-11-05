import { useMemo } from 'react';
import { PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip } from 'recharts';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_STROKE_WIDTH,
  radarMax,
  radarRadius,
  radarRings,
} from '../../shared/radar';

function Chart({ width, height, data }: GalleryChartProps<'radar'>) {
  const rows = useMemo(
    () =>
      data.categories.map((category, i) => ({
        category,
        ...Object.fromEntries(data.series.map((s, j) => [`v${j}`, s.values[i]])),
      })),
    [data],
  );
  const max = radarMax(data);
  const radius = radarRadius(width, height);
  return (
    <RadarChart
      width={width}
      height={height}
      margin={MARGIN}
      data={rows}
      cx={MARGIN.left + (width - MARGIN.left - MARGIN.right) / 2}
      cy={MARGIN.top + (height - MARGIN.top - MARGIN.bottom) / 2}
      innerRadius={0}
      outerRadius={radius}
      startAngle={90}
      endAngle={-270}
    >
      <PolarGrid
        gridType="polygon"
        polarAngles={data.categories.map((_, i) => 90 - (360 * i) / data.categories.length)}
        stroke={RADAR_GRID_COLOR}
        strokeWidth={1}
        polarRadius={radarRings(max).map(r => (r / max) * radius)}
      />
      <PolarRadiusAxis domain={[0, max]} tick={false} tickLine={false} axisLine={false} />
      <Tooltip isAnimationActive={EFFECTS} labelFormatter={i => data.categories[Number(i)]} />
      {data.series.map((s, j) => (
        <Radar
          key={s.id}
          name={s.id}
          dataKey={`v${j}`}
          stroke={s.color}
          strokeWidth={RADAR_STROKE_WIDTH}
          fill={s.color}
          fillOpacity={RADAR_FILL_OPACITY}
          dot={false}
          isAnimationActive={EFFECTS}
        />
      ))}
    </RadarChart>
  );
}

export default { settleMode: 'raf' as const, Chart };
