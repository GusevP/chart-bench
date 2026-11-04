import { LineChart } from 'echarts/charts';
import type { LineSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { EChart } from '../shared/EChart';

use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<LineSeriesOption | GridComponentOption | TooltipComponentOption>;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const option = useMemo(
    (): Option => ({
      animation: false,
      grid: { ...MARGIN, outerBoundsMode: 'none' },
      xAxis: { type: 'category', data: data.categories, boundaryGap: false, axisLabel: { hideOverlap: true } },
      yAxis: { type: 'value', axisLine: { show: true }, axisTick: { show: true } },
      tooltip: { trigger: 'axis' },
      series: data.series.map((s): LineSeriesOption => ({
        type: 'line',
        name: s.id,
        stack: 'total',
        data: s.values,
        color: s.color,
        showSymbol: false,
        areaStyle: { opacity: 1 },
      })),
    }),
    [data],
  );
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
