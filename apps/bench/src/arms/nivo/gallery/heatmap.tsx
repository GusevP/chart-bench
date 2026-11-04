import { HeatMap } from '@nivo/heatmap';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { heatmapRamp } from '../../shared/colorRamp';
import { thinTicks } from '../../shared/ticks';

function Chart({ width, height, data }: GalleryChartProps<'heatmap'>) {
  const rows = useMemo(
    () =>
      data.ys.map((id, y) => ({
        id,
        data: data.xs.map((x, i) => ({ x, y: data.values[y]![i]! })),
      })),
    [data],
  );
  const ramp = useMemo(() => heatmapRamp(data.values), [data]);
  return (
    <div className="crisp">
      <style>{'.crisp rect{shape-rendering:crispEdges}'}</style>
      <HeatMap
        width={width}
        height={height}
        margin={MARGIN}
        data={rows}
        animate={false}
        enableLabels={false}
        colors={cell => ramp(cell.value ?? 0)}
        hoverTarget="cell"
        inactiveOpacity={1}
        axisTop={null}
        axisBottom={{ tickValues: thinTicks(data.xs) }}
        axisLeft={{ tickValues: thinTicks(data.ys) }}
      />
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
