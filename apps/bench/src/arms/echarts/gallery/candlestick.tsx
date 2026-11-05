import { CandlestickChart } from 'echarts/charts';
import type { CandlestickSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import { use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { CANDLE_DOWN, CANDLE_RATIO, CANDLE_STROKE_WIDTH, CANDLE_UP, candleScale } from '../../shared/candles';
import { thinTicks } from '../../shared/ticks';
import { EChart } from '../shared/EChart';

use([CandlestickChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<CandlestickSeriesOption | GridComponentOption | TooltipComponentOption>;

const flat = { color: CANDLE_UP, color0: CANDLE_UP, borderColor: CANDLE_UP, borderColor0: CANDLE_UP };

function Chart({ width, height, data, onSettled }: GalleryChartProps<'candlestick'>) {
  const option = useMemo((): Option => {
    const { domain, step } = candleScale(data.candles);
    const shown = new Set(thinTicks(data.candles.map(c => c.t)));
    return {
      animation: false,
      grid: { ...MARGIN, outerBoundsMode: 'none' },
      xAxis: {
        type: 'category',
        data: data.candles.map(c => c.t),
        axisLabel: { interval: (_: number, t: string) => shown.has(t) },
      },
      yAxis: {
        type: 'value',
        min: domain[0],
        max: domain[1],
        interval: step,
        axisLine: { show: true },
        axisTick: { show: true },
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      series: [
        {
          type: 'candlestick',
          large: false,
          barWidth: `${CANDLE_RATIO * 100}%`,
          itemStyle: {
            color: CANDLE_UP,
            color0: CANDLE_DOWN,
            borderColor: CANDLE_UP,
            borderColor0: CANDLE_DOWN,
            borderWidth: CANDLE_STROKE_WIDTH,
          },
          data: data.candles.map(c => {
            const value = [c.open, c.close, c.low, c.high];
            return c.open === c.close ? { value, itemStyle: flat } : value;
          }),
        },
      ],
    };
  }, [data]);
  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
