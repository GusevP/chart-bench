import Highcharts from 'highcharts';
import 'highcharts/modules/stock';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import {
  CANDLE_DOWN,
  CANDLE_RATIO,
  CANDLE_STROKE_WIDTH,
  CANDLE_UP,
  candleScale,
} from '../../shared/candles';
import { base, categoryAxis, valueAxis } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'candlestick'>) {
  const options = useMemo<Highcharts.Options>(() => {
    const { domain, step } = candleScale(data.candles);
    return {
      ...base(width, height, onSettled),
      xAxis: categoryAxis(data.candles.map(c => c.t)),
      yAxis: { ...valueAxis, min: domain[0], max: domain[1], tickInterval: step, startOnTick: false, endOnTick: false },
      series: [
        {
          type: 'candlestick',
          name: 'Price',
          color: CANDLE_DOWN,
          lineColor: CANDLE_DOWN,
          upColor: CANDLE_UP,
          upLineColor: CANDLE_UP,
          lineWidth: CANDLE_STROKE_WIDTH,
          groupPadding: (1 - CANDLE_RATIO) / 2,
          pointPadding: 0,
          dataGrouping: { enabled: false },
          // Highcharts counts open === close as down; the shared rule counts it as up.
          data: data.candles.map(({ open, high, low, close }) =>
            open === close
              ? { open, high, low, close, color: CANDLE_UP, lineColor: CANDLE_UP }
              : { open, high, low, close },
          ),
        },
      ],
    };
  }, [width, height, data, onSettled]);
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
