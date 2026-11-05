import { PieChart } from 'echarts/charts';
import type { PieSeriesOption } from 'echarts/charts';
import { TooltipComponent } from 'echarts/components';
import type { TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO, donutRadius } from '../../shared/donut';
import { EChart } from '../shared/EChart';

use([PieChart, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<PieSeriesOption | TooltipComponentOption>;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'donut'>) {
  const option = useMemo((): Option => {
    const radius = donutRadius(width, height);
    return {
      animation: EFFECTS,
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'pie',
          center: [
            MARGIN.left + (width - MARGIN.left - MARGIN.right) / 2,
            MARGIN.top + (height - MARGIN.top - MARGIN.bottom) / 2,
          ],
          radius: [radius * INNER_RATIO, radius],
          startAngle: 90,
          clockwise: true,
          padAngle: 0,
          minAngle: 0,
          label: { show: false },
          labelLine: { show: false },
          itemStyle: { borderWidth: 0 },
          emphasis: { scale: EFFECTS, focus: EFFECTS ? 'self' : 'none' },
          data: data.slices.map(s => ({ name: s.id, value: s.value, itemStyle: { color: s.color } })),
        },
      ],
    };
  }, [data, width, height]);
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
