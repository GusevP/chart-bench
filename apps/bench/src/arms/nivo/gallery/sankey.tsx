import { Sankey } from '@nivo/sankey';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { LINK_OPACITY, NODE_GAP, NODE_WIDTH, sankeyColors } from '../../shared/sankey';

function Chart({ width, height, data }: GalleryChartProps<'sankey'>) {
  const colors = useMemo(() => sankeyColors(data), [data]);
  const graph = useMemo(() => ({ nodes: data.nodes, links: data.links }), [data]);
  return (
    <Sankey
      width={width}
      height={height}
      margin={MARGIN}
      data={graph}
      align="start"
      nodeThickness={NODE_WIDTH}
      nodeSpacing={NODE_GAP}
      nodeOpacity={1}
      nodeBorderWidth={0}
      linkOpacity={LINK_OPACITY}
      linkBlendMode="normal"
      enableLinkGradient={false}
      enableLabels={false}
      animate={false}
      colors={({ id }) => colors.get(String(id)) ?? 'black'}
    />
  );
}

export default { settleMode: 'raf' as const, Chart };
