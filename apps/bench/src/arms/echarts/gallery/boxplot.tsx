import { BoxplotChart } from 'echarts/charts';
import type { BoxplotSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { BOX_RATIO, BOX_STROKE, BOX_STROKE_WIDTH, boxDomain, boxplotStats } from '../../shared/boxplot';
import { EChart } from '../shared/EChart';

use([BoxplotChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<BoxplotSeriesOption | GridComponentOption | TooltipComponentOption>;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'boxplot'>) {
  const option = useMemo((): Option => {
    const stats = boxplotStats(data);
    const [min, max] = boxDomain(stats);
    const boxWidth = `${BOX_RATIO * 100}%`;
    return {
      animation: false,
      grid: { ...MARGIN, outerBoundsMode: 'none' },
      xAxis: { type: 'category', data: stats.map(s => s.id), axisLabel: { hideOverlap: true } },
      yAxis: { type: 'value', min, max, axisLine: { show: true }, axisTick: { show: true } },
      tooltip: { trigger: 'item' },
      series: [
        {
          type: 'boxplot',
          boxWidth: [boxWidth, boxWidth],
          itemStyle: { borderColor: BOX_STROKE, borderWidth: BOX_STROKE_WIDTH },
          data: stats.map(s => ({
            value: [s.whiskerLow, s.q1, s.median, s.q3, s.whiskerHigh],
            itemStyle: { color: s.color },
          })),
        },
      ],
    };
  }, [data]);
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
