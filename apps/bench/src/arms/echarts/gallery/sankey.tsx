import { SankeyChart } from 'echarts/charts';
import type { SankeySeriesOption } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import type { TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { ITERATIONS, LINK_OPACITY, NODE_GAP, NODE_WIDTH, sankeyColors } from '../../shared/sankey';
import { EChart } from '../shared/EChart';

use([SankeyChart, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<SankeySeriesOption | TooltipComponentOption>;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'sankey'>) {
  const option = useMemo((): Option => {
    const colors = sankeyColors(data);
    return {
      animation: EFFECTS,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'sankey',
          ...MARGIN,
          orient: 'horizontal',
          draggable: false,
          nodeAlign: 'left',
          nodeWidth: NODE_WIDTH,
          nodeGap: NODE_GAP,
          layoutIterations: ITERATIONS,
          label: { show: false },
          itemStyle: { borderWidth: 0 },
          lineStyle: { color: 'source', opacity: LINK_OPACITY, curveness: 0.5 },
          emphasis: { disabled: !EFFECTS, focus: EFFECTS ? 'adjacency' : 'none' },
          data: data.nodes.map(n => ({ name: n.id, itemStyle: { color: colors.get(n.id) } })),
          links: data.links,
        },
      ],
    };
  }, [data]);
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
