import { useMemo } from 'react';
import { band, candlestick } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { CANDLE_DOWN, CANDLE_RATIO, CANDLE_UP, candleScale } from '../../shared/candles';
import { Plot, column, places } from '../shared';
import type { PlotOptions } from '../shared';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'candlestick'>) {
  const { candles } = data;
  const options = useMemo<PlotOptions>(() => {
    const { domain, step } = candleScale(candles);
    return {
      width,
      height,
      margin: MARGIN,
      x: band({ label: '', categories: candles.map(c => c.t) }),
      y: { domain, label: '', step },
      marks: [
        candlestick({
          x: places(candles.length),
          open: column(candles, c => c.open),
          high: column(candles, c => c.high),
          low: column(candles, c => c.low),
          close: column(candles, c => c.close),
          width: CANDLE_RATIO,
          color: CANDLE_UP,
          down: CANDLE_DOWN,
        }),
      ],
    };
  }, [candles, width, height]);
  const tip = useMemo<TooltipOptions>(
    () => ({
      mode: 'nearest',
      text: (_label, x) => {
        const c = candles[Math.round(x)]!;
        return `${c.t}: open ${c.open}, high ${c.high}, low ${c.low}, close ${c.close}`;
      },
    }),
    [candles],
  );
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
