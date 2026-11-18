import Highcharts from 'highcharts';
import 'highcharts/modules/sankey';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { LINK_OPACITY, NODE_GAP, NODE_WIDTH, sankeyColors } from '../../shared/sankey';
import { base } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'sankey'>) {
  const options = useMemo<Highcharts.Options>(() => {
    const colors = sankeyColors(data);
    return {
      ...base(width, height, onSettled),
      series: [
        {
          type: 'sankey',
          nodeWidth: NODE_WIDTH,
          nodePadding: NODE_GAP,
          linkOpacity: LINK_OPACITY,
          borderWidth: 0,
          borderRadius: 0,
          dataLabels: { enabled: false },
          nodes: data.nodes.map(n => ({ id: n.id, color: colors.get(n.id) })),
          data: data.links.map(l => ({ from: l.source, to: l.target, weight: l.value })),
        },
      ],
    };
  }, [width, height, data, onSettled]);
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
