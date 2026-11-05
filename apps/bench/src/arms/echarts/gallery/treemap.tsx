import { TreemapChart } from 'echarts/charts';
import type { TreemapSeriesOption } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import type { TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps, TreeNode } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { treemapRamp } from '../../shared/treemap';
import { EChart } from '../shared/EChart';

use([TreemapChart, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<TreemapSeriesOption | TooltipComponentOption>;
type Item = NonNullable<TreemapSeriesOption['data']>[number];

function Chart({ width, height, data, onSettled }: GalleryChartProps<'treemap'>) {
  const option = useMemo((): Option => {
    const ramp = treemapRamp(data);
    const toItem = (node: TreeNode): Item =>
      node.children
        ? { name: node.id, itemStyle: { color: 'transparent' }, children: node.children.map(toItem) }
        : { name: node.id, value: node.value!, itemStyle: { color: ramp(node.value!) } };
    return {
      animation: EFFECTS,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'treemap',
          // TreemapSeries defaults `animation` on, which outranks the top-level `animation: EFFECTS`.
          animation: EFFECTS,
          ...MARGIN,
          roam: false,
          nodeClick: false,
          breadcrumb: { show: false },
          sort: false,
          squareRatio: (1 + Math.sqrt(5)) / 2,
          visibleMin: 0,
          label: { show: false },
          upperLabel: { show: false },
          emphasis: { upperLabel: { show: false }, focus: EFFECTS ? 'self' : 'none' },
          itemStyle: { borderWidth: 0, gapWidth: 0 },
          data: data.children ? data.children.map(toItem) : [toItem(data)],
        },
      ],
    };
  }, [data]);
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
