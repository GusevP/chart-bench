import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { LINK_OPACITY, NODE_GAP, NODE_WIDTH, sankeyColors } from '../../shared/sankey';
import { Plot, baseLayout, withAlpha } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'sankey'>) {
  const figure = useMemo((): Figure => {
    const colors = sankeyColors(data);
    const index = new Map(data.nodes.map((n, i) => [n.id, i]));
    const linkColors = data.links.map(l => withAlpha(colors.get(l.source)!, LINK_OPACITY));
    return {
      data: [
        {
          type: 'sankey',
          arrangement: 'fixed',
          valueformat: '~g',
          node: {
            align: 'left',
            thickness: NODE_WIDTH,
            pad: NODE_GAP,
            color: data.nodes.map(n => colors.get(n.id)!),
            customdata: data.nodes.map(n => n.id),
            line: { width: 0 },
            hovertemplate: '%{customdata}: %{value}<extra></extra>',
          },
          link: {
            source: data.links.map(l => index.get(l.source)!),
            target: data.links.map(l => index.get(l.target)!),
            value: data.links.map(l => l.value),
            color: linkColors,
            hovercolor: EFFECTS ? undefined : linkColors,
            hovertemplate: '%{source.customdata} → %{target.customdata}: %{value}<extra></extra>',
          },
        },
      ],
      layout: baseLayout(width, height),
    };
  }, [data, width, height]);
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
