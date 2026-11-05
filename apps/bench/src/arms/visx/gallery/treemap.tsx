import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { Treemap, hierarchy, treemapSquarify } from '@visx/hierarchy';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps, TreeNode } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { treemapRamp } from '../../shared/treemap';
import { tooltipStyle } from '../shared/style';

type Tip = { id: string; value: number };

function Chart({ width, height, data }: GalleryChartProps<'treemap'>) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const root = useMemo(() => hierarchy<TreeNode>(data).sum(d => d.value ?? 0), [data]);
  const ramp = useMemo(() => treemapRamp(data), [data]);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<Tip>();

  const onMove = (tip: Tip) => (event: MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (point) showTooltip({ tooltipData: tip, tooltipLeft: point.x, tooltipTop: point.y });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <Treemap<TreeNode> root={root} size={[innerW, innerH]} tile={treemapSquarify} round>
            {laidOut =>
              laidOut.leaves().map(leaf => (
                <rect
                  key={leaf.data.id}
                  x={leaf.x0}
                  y={leaf.y0}
                  width={leaf.x1 - leaf.x0}
                  height={leaf.y1 - leaf.y0}
                  fill={ramp(leaf.value ?? 0)}
                  shapeRendering="crispEdges"
                  onMouseMove={onMove({ id: leaf.data.id, value: leaf.value ?? 0 })}
                  onMouseLeave={hideTooltip}
                />
              ))
            }
          </Treemap>
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div>{tooltipData.id}</div>
          <div>{tooltipData.value}</div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
