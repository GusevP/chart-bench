import { BarChart } from 'echarts/charts';
import type { BarSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { EChart } from '../shared/EChart';

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<BarSeriesOption | GridComponentOption | TooltipComponentOption>;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-bar'>) {
  const option = useMemo(
    (): Option => ({
      animation: false,
      grid: { ...MARGIN, outerBoundsMode: 'none' },
      xAxis: { type: 'category', data: data.categories, axisLabel: { hideOverlap: true } },
      yAxis: { type: 'value' },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      series: data.series.map((s): BarSeriesOption => ({
        type: 'bar',
        name: s.id,
        stack: 'total',
        data: s.values,
        color: s.color,
      })),
    }),
    [data],
  );
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
