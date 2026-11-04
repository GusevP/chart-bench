import { HeatmapChart } from 'echarts/charts';
import type { HeatmapSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { heatmapRamp } from '../../shared/heatmap';
import { thinTicks } from '../../shared/ticks';
import { EChart } from '../shared/EChart';

use([HeatmapChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<HeatmapSeriesOption | GridComponentOption | TooltipComponentOption>;

const shownOnly = (labels: string[]) => {
  const shown = new Set(thinTicks(labels));
  return (_: number, label: string) => shown.has(label);
};

function Chart({ width, height, data, onSettled }: GalleryChartProps<'heatmap'>) {
  const option = useMemo((): Option => {
    const ramp = heatmapRamp(data.values);
    return {
      animation: false,
      grid: { ...MARGIN, outerBoundsMode: 'none' },
      xAxis: {
        type: 'category',
        data: data.xs,
        axisLabel: { interval: shownOnly(data.xs) },
        axisTick: { interval: shownOnly(data.xs), alignWithLabel: true },
      },
      yAxis: {
        type: 'category',
        data: data.ys,
        inverse: true,
        axisLine: { show: true },
        axisLabel: { interval: shownOnly(data.ys) },
        axisTick: { show: true, interval: shownOnly(data.ys), alignWithLabel: true },
      },
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'heatmap',
          label: { show: false },
          itemStyle: { borderWidth: 0 },
          data: data.ys.flatMap((_, j) =>
            data.xs.map((_, i) => ({
              value: [i, j, data.values[j]![i]!],
              itemStyle: { color: ramp(data.values[j]![i]!) },
            })),
          ),
        },
      ],
    };
  }, [data]);
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
