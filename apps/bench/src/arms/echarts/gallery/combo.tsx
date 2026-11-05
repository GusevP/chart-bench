import { BarChart, LineChart } from 'echarts/charts';
import type { BarSeriesOption, LineSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { EChart } from '../shared/EChart';

use([BarChart, LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<
  BarSeriesOption | LineSeriesOption | GridComponentOption | TooltipComponentOption
>;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const option = useMemo(
    (): Option => ({
      animation: EFFECTS,
      grid: { ...MARGIN, right: COMBO_RIGHT, outerBoundsMode: 'none' },
      xAxis: { type: 'category', data: data.categories, axisLabel: { hideOverlap: true } },
      yAxis: [
        { type: 'value', min: 0, axisLine: { show: true }, axisTick: { show: true } },
        { type: 'value', min: 0, axisLine: { show: true }, axisTick: { show: true }, splitLine: { show: false } },
      ],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      series: [
        { type: 'bar', emphasis: { focus: EFFECTS ? 'series' : 'none' }, name: data.bars.id, yAxisIndex: 0, data: data.bars.values, color: data.bars.color },
        {
          type: 'line',
          emphasis: { focus: EFFECTS ? 'series' : 'none' },
          name: data.line.id,
          yAxisIndex: 1,
          data: data.line.values,
          color: data.line.color,
          lineStyle: { width: COMBO_LINE_WIDTH },
          symbol: 'none',
        },
      ],
    }),
    [data],
  );
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
