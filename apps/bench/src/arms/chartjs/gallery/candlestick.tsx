import { CandlestickController, CandlestickElement } from 'chartjs-chart-financial';
import 'chartjs-adapter-luxon';
import { Chart as ChartJS, LinearScale, TimeSeriesScale, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import {
  CANDLE_DOWN,
  CANDLE_RATIO,
  CANDLE_STROKE_WIDTH,
  CANDLE_UP,
  candleScale,
} from '../../shared/candles';
import { thinTicks } from '../../shared/ticks';
import { fixHeight, fixWidth, useSettlePlugin } from '../shared/chart';

ChartJS.register(CandlestickController, CandlestickElement, TimeSeriesScale, LinearScale, Tooltip);

const colors = { up: CANDLE_UP, down: CANDLE_DOWN, unchanged: CANDLE_UP };

function Chart({ width, height, data, onSettled }: GalleryChartProps<'candlestick'>) {
  const plugins = useSettlePlugin<'candlestick'>(onSettled);
  const chartData = useMemo<ChartData<'candlestick'>>(
    () => ({
      datasets: [
        {
          label: 'Price',
          data: data.candles.map(c => ({ x: Date.parse(c.t), o: c.open, h: c.high, l: c.low, c: c.close })) as never,
          backgroundColors: colors,
          borderColors: colors,
          borderWidth: CANDLE_STROKE_WIDTH,
          categoryPercentage: CANDLE_RATIO,
          barPercentage: 1,
        },
      ],
    }),
    [data],
  );
  const options = useMemo<ChartOptions<'candlestick'>>(() => {
    const { domain, step } = candleScale(data.candles);
    const shown = new Set(thinTicks(data.candles.map(c => c.t)).map(t => Date.parse(t)));
    return {
      responsive: false,
      animation: EFFECTS ? undefined : false,
      layout: { padding: { top: MARGIN.top, right: MARGIN.right } },
      scales: {
        x: {
          adapters: { date: { zone: 'utc' } },
          grid: { drawOnChartArea: false },
          time: { unit: 'day', tooltipFormat: 'yyyy-MM-dd', displayFormats: { day: 'yyyy-MM-dd' } },
          ticks: { autoSkip: false, maxRotation: 0, major: { enabled: false } },
          afterBuildTicks: scale => {
            scale.ticks = scale.ticks.filter(t => shown.has(t.value));
          },
          afterFit: fixHeight,
        },
        y: { min: domain[0], max: domain[1], ticks: { stepSize: step }, afterFit: fixWidth },
      },
    };
  }, [data]);
  return (
    <ReactChart type="candlestick" width={width} height={height} data={chartData} options={options} plugins={plugins} />
  );
}

export default { settleMode: 'signal' as const, Chart };
