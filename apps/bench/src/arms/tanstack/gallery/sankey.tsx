import { d3Curve, defineChart, link, rect } from '@tanstack/charts';
import { sankeyDiagram } from '@tanstack/charts/network/sankey';
import { Chart as TanChart } from '../shared/Chart';
import { tooltip } from '@tanstack/charts/tooltip';
import { curveBumpX } from 'd3-shape';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { ITERATIONS, LINK_OPACITY, NODE_GAP, NODE_WIDTH, sankeyColors } from '../../shared/sankey';

const bump = d3Curve(curveBumpX);

function Chart({ width, height, data }: GalleryChartProps<'sankey'>) {
  const definition = useMemo(() => {
    const colors = sankeyColors(data);
    return defineChart({
      marks: [
        sankeyDiagram({
          nodes: data.nodes,
          links: data.links,
          nodeKey: 'id',
          source: 'source',
          target: 'target',
          value: 'value',
          align: 'left',
          nodeWidth: NODE_WIDTH,
          nodePadding: NODE_GAP,
          iterations: ITERATIONS,
          marks: ({ nodes, links }) =>
            [
              link(links, {
                x1: 'x1',
                y1: 'y1',
                x2: 'x2',
                y2: 'y2',
                key: 'key',
                curve: bump,
                lineCap: 'butt',
                stroke: l => colors.get(String(l.sourceKey))!,
                strokeOpacity: LINK_OPACITY,
                strokeWidth: l => Math.max(1, l.width),
              }),
              rect(nodes, {
                x1: 'x0',
                x2: 'x1',
                y1: 'y0',
                y2: 'y1',
                key: 'key',
                inset: 0,
                color: n => n.data.id,
              }),
            ] as const,
        }),
      ],
      scales: { x: null, y: null },
      color: { domain: data.nodes.map(n => n.id), range: data.nodes.map(n => colors.get(n.id)!) },
      guides: false,
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return <TanChart definition={definition} width={width} height={height} ariaLabel="Sankey" />;
}

export default { settleMode: 'raf' as const, Chart };
