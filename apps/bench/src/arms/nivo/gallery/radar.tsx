import { Radar } from '@nivo/radar';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_RINGS,
  RADAR_STROKE_WIDTH,
  radarMax,
} from '../../shared/radar';

const noLabel = () => null;
const theme = { grid: { line: { stroke: RADAR_GRID_COLOR, strokeWidth: 1 } } };

function Chart({ width, height, data }: GalleryChartProps<'radar'>) {
  const rows = useMemo(
    () =>
      data.categories.map((category, i) => ({
        category,
        ...Object.fromEntries(data.series.map(s => [s.id, s.values[i]!])),
      })),
    [data],
  );
  const keys = useMemo(() => data.series.map(s => s.id), [data]);
  const colorById = useMemo(() => new Map(data.series.map(s => [s.id, s.color])), [data]);
  return (
    <Radar
      width={width}
      height={height}
      margin={MARGIN}
      data={rows}
      keys={keys}
      indexBy="category"
      maxValue={radarMax(data)}
      rotation={0}
      curve="linearClosed"
      gridShape="linear"
      gridLevels={RADAR_RINGS}
      gridLabel={noLabel}
      enableDots={false}
      fillOpacity={RADAR_FILL_OPACITY}
      borderWidth={RADAR_STROKE_WIDTH}
      theme={theme}
      animate={EFFECTS}
      colors={({ key }) => colorById.get(key) ?? 'black'}
    />
  );
}

export default { settleMode: 'raf' as const, Chart };
