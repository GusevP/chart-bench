import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { CANDLE_DOWN, CANDLE_RATIO, CANDLE_STROKE_WIDTH, CANDLE_UP, candleScale } from '../../shared/candles';
import { Plot, axis, baseLayout, categoryAxis } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

const style = (color: string) => ({ line: { color, width: CANDLE_STROKE_WIDTH }, fillcolor: color });

function Chart({ width, height, data, onSettled }: GalleryChartProps<'candlestick'>) {
  const figure = useMemo((): Figure => {
    const { domain, step } = candleScale(data.candles);
    const ts = data.candles.map(c => c.t);
    return {
      data: [
        {
          type: 'candlestick',
          name: 'Price',
          x: ts,
          open: data.candles.map(c => c.open),
          high: data.candles.map(c => c.high),
          low: data.candles.map(c => c.low),
          close: data.candles.map(c => c.close),
          increasing: style(CANDLE_UP),
          decreasing: style(CANDLE_DOWN),
        },
      ],
      layout: {
        ...baseLayout(width, height),
        boxgap: 1 - CANDLE_RATIO,
        boxgroupgap: 0,
        hovermode: 'x',
        xaxis: { ...categoryAxis(ts), rangeslider: { visible: false } },
        yaxis: { ...axis, range: domain, dtick: step },
      },
    };
  }, [data, width, height]);
  return <Plot figure={figure} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
