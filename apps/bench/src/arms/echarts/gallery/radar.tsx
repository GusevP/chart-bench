import { RadarChart } from 'echarts/charts';
import type { RadarSeriesOption } from 'echarts/charts';
import { RadarComponent, TooltipComponent } from 'echarts/components';
import type { RadarComponentOption, TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_RINGS,
  RADAR_STROKE_WIDTH,
  radarMax,
  radarRadius,
} from '../../shared/radar';
import { EChart } from '../shared/EChart';

use([RadarChart, RadarComponent, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<RadarSeriesOption | RadarComponentOption | TooltipComponentOption>;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'radar'>) {
  const option = useMemo((): Option => {
    const max = radarMax(data);
    return {
      animation: EFFECTS,
      tooltip: { trigger: 'item' },
      radar: {
        center: [
          MARGIN.left + (width - MARGIN.left - MARGIN.right) / 2,
          MARGIN.top + (height - MARGIN.top - MARGIN.bottom) / 2,
        ],
        radius: radarRadius(width, height),
        startAngle: 90,
        clockwise: true,
        shape: 'polygon',
        splitNumber: RADAR_RINGS,
        indicator: data.categories.map(name => ({ name, min: 0, max })),
        axisName: { show: false },
        axisLabel: { show: false },
        axisTick: { show: false },
        splitArea: { show: false },
        splitLine: { lineStyle: { color: RADAR_GRID_COLOR, width: 1 } },
        axisLine: { lineStyle: { color: RADAR_GRID_COLOR, width: 1 } },
      },
      series: [
        {
          type: 'radar',
          symbol: 'none',
          lineStyle: { width: RADAR_STROKE_WIDTH },
          areaStyle: { opacity: RADAR_FILL_OPACITY },
          emphasis: { disabled: !EFFECTS, focus: EFFECTS ? 'self' : 'none' },
          data: data.series.map(s => ({
            name: s.id,
            value: s.values,
            itemStyle: { color: s.color },
            lineStyle: { color: s.color },
            areaStyle: { color: s.color },
          })),
        },
      ],
    };
  }, [data, width, height]);
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
