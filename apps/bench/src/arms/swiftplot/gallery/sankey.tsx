import { useMemo } from 'react';
import { sankey } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { sankeyColors } from '../../shared/sankey';
import { Plot } from '../shared';
import type { PlotOptions } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'sankey'>) {
  const options = useMemo<PlotOptions>(() => {
    const place = new Map(data.nodes.map((n, i) => [n.id, i]));
    return {
      width,
      height,
      margin: MARGIN,
      frame: 'blank',
      marks: [
        sankey({
          nodes: data.nodes.map(n => n.id),
          source: data.links.map(l => place.get(l.source)!),
          target: data.links.map(l => place.get(l.target)!),
          value: data.links.map(l => l.value),
          colors: [...sankeyColors(data).values()],
        }),
      ],
    };
  }, [data, width, height]);
  const tip = useMemo<TooltipOptions>(() => {
    const flow = (end: 'source' | 'target', id: string) =>
      data.links.reduce((sum, l) => (l[end] === id ? sum + l.value : sum), 0);
    return {
      mode: 'nearest',
      text: (_label, _x, _y, row = 0) => {
        const link = data.links[row - data.nodes.length];
        if (link) return `${link.source} → ${link.target}: ${link.value}`;
        const id = data.nodes[row]?.id ?? '';
        return `${id}: ${Math.max(flow('source', id), flow('target', id))}`;
      },
    };
  }, [data]);
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
