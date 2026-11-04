import { curveLinearClosed } from '@visx/curve';
import { localPoint } from '@visx/event';
import { GridAngle } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleLinear, scalePoint } from '@visx/scale';
import { LineRadial } from '@visx/shape';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_STROKE_WIDTH,
  radarMax,
  radarRadius,
  radarRings,
} from '../../shared/radar';
import { tooltipStyle } from '../shared/style';

function Chart({ width, height, data }: GalleryChartProps<'radar'>) {
  const radius = radarRadius(width, height);
  const count = data.categories.length;
  const max = radarMax(data);
  const indices = useMemo(() => data.categories.map((_, i) => i), [data]);
  const angle = useMemo(
    () => scalePoint<string>({ domain: data.categories, range: [0, (2 * Math.PI * (count - 1)) / count] }),
    [data, count],
  );
  const rScale = useMemo(() => scaleLinear<number>({ domain: [0, max], range: [0, radius] }), [max, radius]);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } =
    useTooltip<number>();

  const onMove = (event: MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const dx = point.x - MARGIN.left - (width - MARGIN.left - MARGIN.right) / 2;
    const dy = point.y - MARGIN.top - (height - MARGIN.top - MARGIN.bottom) / 2;
    const turn = Math.atan2(dx, -dy) / (2 * Math.PI);
    const index = (Math.round(turn * count) + count) % count;
    showTooltip({ tooltipData: index, tooltipLeft: point.x, tooltipTop: point.y });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group
          left={MARGIN.left + (width - MARGIN.left - MARGIN.right) / 2}
          top={MARGIN.top + (height - MARGIN.top - MARGIN.bottom) / 2}
        >
          {radarRings(max).map(ring => (
            <LineRadial<number>
              key={ring}
              data={indices}
              angle={i => angle(data.categories[i]!) ?? 0}
              radius={rScale(ring)}
              curve={curveLinearClosed}
              fill="none"
              stroke={RADAR_GRID_COLOR}
              strokeWidth={1}
            />
          ))}
          <GridAngle
            scale={angle}
            tickValues={data.categories}
            outerRadius={radius}
            stroke={RADAR_GRID_COLOR}
            strokeWidth={1}
          />
          {data.series.map(s => (
            <LineRadial<number>
              key={s.id}
              data={indices}
              angle={i => angle(data.categories[i]!) ?? 0}
              radius={i => rScale(s.values[i]!)}
              curve={curveLinearClosed}
              fill={s.color}
              fillOpacity={RADAR_FILL_OPACITY}
              stroke={s.color}
              strokeWidth={RADAR_STROKE_WIDTH}
            />
          ))}
          <rect
            x={-radius}
            y={-radius}
            width={2 * radius}
            height={2 * radius}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={hideTooltip}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData !== undefined && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div>{data.categories[tooltipData]}</div>
          {data.series.map(s => (
            <div key={s.id} style={{ color: s.color }}>
              {s.id}: {s.values[tooltipData]}
            </div>
          ))}
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
