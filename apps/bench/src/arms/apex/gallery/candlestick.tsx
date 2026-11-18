import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/candlestick';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import { CANDLE_DOWN, CANDLE_RATIO, CANDLE_STROKE_WIDTH, CANDLE_UP, candleScale } from '../../shared/candles';
import { Y_AXIS, Y_LABELS, categoryTooltipX, categoryX, useGalleryOptions } from '../shared/base';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'candlestick'>) {
  const base = useGalleryOptions(onSettled);
  const series = useMemo<ApexAxisChartSeries>(
    () => [{ name: 'Price', data: data.candles.map(c => ({ x: c.t, y: [c.open, c.high, c.low, c.close] })) }],
    [data],
  );
  const options = useMemo<ApexOptions>(() => {
    const { domain, step } = candleScale(data.candles);
    return {
      ...base,
      chart: { ...base.chart, type: 'candlestick' },
      stroke: { width: CANDLE_STROKE_WIDTH },
      plotOptions: {
        bar: { columnWidth: `${CANDLE_RATIO * 100}%` },
        candlestick: { colors: { upward: CANDLE_UP, downward: CANDLE_DOWN }, wick: { useFillColor: true } },
      },
      xaxis: { ...categoryX(data.candles.map(c => c.t)), axisTicks: { show: false } },
      yaxis: {
        ...Y_AXIS,
        min: domain[0],
        max: domain[1],
        tickAmount: Math.round((domain[1] - domain[0]) / step),
        labels: { ...Y_LABELS, formatter: v => String(+v.toFixed(2)) },
      },
      tooltip: { shared: true, intersect: false, x: categoryTooltipX(data.candles.map(c => c.t)) },
    };
  }, [base, data]);
  return <ApexChart type="candlestick" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
