import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { Sankey, sankeyLeft } from '@visx/sankey';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { ITERATIONS, LINK_OPACITY, NODE_GAP, NODE_WIDTH, sankeyColors } from '../../shared/sankey';
import { tooltipStyle } from '../shared/style';

type Node = { id: string };
type Link = { source: string; target: string; value: number };

function Chart({ width, height, data }: GalleryChartProps<'sankey'>) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const colors = useMemo(() => sankeyColors(data), [data]);
  const root = useMemo(
    () => ({ nodes: data.nodes.map(n => ({ ...n })), links: data.links.map(l => ({ ...l })) }),
    [data],
  );
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<string>();

  const onMove = (text: string) => (event: MouseEvent<SVGElement>) => {
    const point = localPoint(event);
    if (point) showTooltip({ tooltipData: text, tooltipLeft: point.x, tooltipTop: point.y });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <Sankey<Node, Link>
            root={root}
            size={[innerW, innerH]}
            nodeId={n => n.id}
            nodeWidth={NODE_WIDTH}
            nodePadding={NODE_GAP}
            nodeAlign={sankeyLeft}
            iterations={ITERATIONS}
          >
            {({ graph, createPath }) => (
              <>
                {graph.links.map((l, i) => {
                  const source = l.source as Node;
                  const target = l.target as Node;
                  return (
                    <path
                      key={i}
                      d={createPath(l) ?? ''}
                      fill="none"
                      stroke={colors.get(source.id)}
                      strokeOpacity={LINK_OPACITY}
                      strokeWidth={Math.max(1, l.width ?? 0)}
                      onMouseMove={onMove(`${source.id} → ${target.id}: ${l.value}`)}
                      onMouseLeave={hideTooltip}
                    />
                  );
                })}
                {graph.nodes.map(n => (
                  <rect
                    key={n.id}
                    x={n.x0}
                    y={n.y0}
                    width={(n.x1 ?? 0) - (n.x0 ?? 0)}
                    height={(n.y1 ?? 0) - (n.y0 ?? 0)}
                    fill={colors.get(n.id)}
                    onMouseMove={onMove(`${n.id}: ${n.value}`)}
                    onMouseLeave={hideTooltip}
                  />
                ))}
              </>
            )}
          </Sankey>
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          {tooltipData}
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
