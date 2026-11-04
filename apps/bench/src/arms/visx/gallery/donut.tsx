import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { Pie } from '@visx/shape';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO, donutRadius } from '../../shared/donut';
import { tooltipStyle } from '../shared/style';

type Slice = GalleryChartProps<'donut'>['data']['slices'][number];

function Chart({ width, height, data }: GalleryChartProps<'donut'>) {
  const radius = donutRadius(width, height);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<Slice>();

  const onMove = (slice: Slice) => (event: MouseEvent<SVGPathElement>) => {
    const point = localPoint(event);
    if (point) showTooltip({ tooltipData: slice, tooltipLeft: point.x, tooltipTop: point.y });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group
          left={MARGIN.left + (width - MARGIN.left - MARGIN.right) / 2}
          top={MARGIN.top + (height - MARGIN.top - MARGIN.bottom) / 2}
        >
          <Pie
            data={data.slices}
            pieValue={s => s.value}
            pieSortValues={null}
            innerRadius={radius * INNER_RATIO}
            outerRadius={radius}
            padAngle={0}
          >
            {({ arcs, path }) =>
              arcs.map(arc => (
                <path
                  key={arc.data.id}
                  d={path(arc) ?? ''}
                  fill={arc.data.color}
                  onMouseMove={onMove(arc.data)}
                  onMouseLeave={hideTooltip}
                />
              ))
            }
          </Pie>
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div style={{ color: tooltipData.color }}>
            {tooltipData.id}: {tooltipData.value}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
