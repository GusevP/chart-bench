import { useMemo } from 'react';
import { band, bands, bar, errorBars } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  CANDLE_DOWN,
  CANDLE_RATIO,
  CANDLE_STROKE_WIDTH,
  CANDLE_UP,
  candleScale,
  isUp,
} from '../../shared/candles';
import { Plot, column } from '../shared';
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
      marks: [true, false].flatMap(up => {
        const rows = candles.flatMap((c, i) => (isUp(c) === up ? [i] : []));
        const of = (value: (c: (typeof candles)[number]) => number) => column(rows, i => value(candles[i]!));
        const [x1, x2] = bands(rows, { width: CANDLE_RATIO });
        const shared = { color: up ? CANDLE_UP : CANDLE_DOWN, group: up ? 'Up' : 'Down' };
        return [
          errorBars({
            x: rows,
            y1: of(c => c.low),
            y2: of(c => c.high),
            cap: 0,
            width: CANDLE_STROKE_WIDTH,
            ...shared,
          }),
          bar({ x1, x2, y1: of(c => c.open), y2: of(c => c.close), ...shared }),
        ];
      }),
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
