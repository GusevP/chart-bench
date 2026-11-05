import { Pie } from '@nivo/pie';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO } from '../../shared/donut';

function Chart({ width, height, data }: GalleryChartProps<'donut'>) {
  const colorById = useMemo(() => new Map(data.slices.map(s => [s.id, s.color])), [data]);
  return (
    <Pie
      width={width}
      height={height}
      margin={MARGIN}
      data={data.slices}
      innerRadius={INNER_RATIO}
      fit={false}
      sortByValue={false}
      padAngle={0}
      cornerRadius={0}
      borderWidth={0}
      animate={EFFECTS}
      activeOuterRadiusOffset={EFFECTS ? 8 : 0}
      enableArcLabels={false}
      enableArcLinkLabels={false}
      colors={({ id }) => colorById.get(String(id)) ?? 'black'}
    />
  );
}

export default { settleMode: 'raf' as const, Chart };
