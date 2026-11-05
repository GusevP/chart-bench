import { useMemo } from 'react';
import { Sankey, Tooltip } from 'recharts';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { ITERATIONS, LINK_OPACITY, NODE_GAP, NODE_WIDTH, sankeyColors } from '../../shared/sankey';

function Chart({ width, height, data }: GalleryChartProps<'sankey'>) {
  const { graph, node, link } = useMemo(() => {
    const colors = sankeyColors(data);
    const index = new Map(data.nodes.map((n, i) => [n.id, i]));
    return {
      graph: {
        nodes: data.nodes.map(n => ({ name: n.id })),
        links: data.links.map(l => ({ source: index.get(l.source)!, target: index.get(l.target)!, value: l.value })),
      },
      node: (p: { x: number; y: number; width: number; height: number; payload: { name: string } }) => (
        <rect x={p.x} y={p.y} width={p.width} height={p.height} fill={colors.get(p.payload.name)} />
      ),
      link: (p: {
        sourceX: number;
        sourceY: number;
        sourceControlX: number;
        targetX: number;
        targetY: number;
        targetControlX: number;
        linkWidth: number;
        payload: { source: { name: string } };
      }) => (
        <path
          d={`M${p.sourceX},${p.sourceY} C${p.sourceControlX},${p.sourceY} ${p.targetControlX},${p.targetY} ${p.targetX},${p.targetY}`}
          fill="none"
          stroke={colors.get(p.payload.source.name)}
          strokeOpacity={LINK_OPACITY}
          strokeWidth={Math.max(1, p.linkWidth)}
        />
      ),
    };
  }, [data]);
  return (
    <Sankey
      width={width}
      height={height}
      margin={MARGIN}
      data={graph}
      align="left"
      nodeWidth={NODE_WIDTH}
      nodePadding={NODE_GAP}
      iterations={ITERATIONS}
      linkCurvature={0.5}
      node={node}
      link={link}
    >
      <Tooltip isAnimationActive={false} />
    </Sankey>
  );
}

export default { settleMode: 'raf' as const, Chart };
