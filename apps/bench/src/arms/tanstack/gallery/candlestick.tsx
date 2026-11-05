import { barY, defineChart, link, tickY } from '@tanstack/charts';
import { Chart as TanChart } from '../shared/Chart';
import { scaleBand } from '@tanstack/charts/scales/band';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  CANDLE_STROKE_WIDTH,
  candleColor,
  candlePaddingInner,
  candlePaddingOuter,
  candleScale,
} from '../../shared/candles';
import { thinTicks } from '../../shared/ticks';

function Chart({ width, height, data }: GalleryChartProps<'candlestick'>) {
  const definition = useMemo(() => {
    const { candles } = data;
    const ts = candles.map(c => c.t);
    const { domain, ticks } = candleScale(candles);
    return defineChart({
      marks: [
        link(candles, { x1: 't', y1: 'low', x2: 't', y2: 'high', stroke: candleColor, strokeWidth: CANDLE_STROKE_WIDTH }),
        barY(candles, {
          x: 't',
          y1: 'open',
          y2: 'close',
          fill: candleColor,
          stroke: candleColor,
          strokeWidth: CANDLE_STROKE_WIDTH,
        }),
        tickY(
          candles.filter(c => c.open === c.close),
          { x: 't', y: 'open', stroke: candleColor, strokeWidth: CANDLE_STROKE_WIDTH },
        ),
      ],
      scales: {
        x: {
          scale: () => scaleBand<string>().domain(ts).paddingInner(candlePaddingInner).paddingOuter(candlePaddingOuter),
          axis: { ticks: { values: thinTicks(ts) } },
        },
        y: { scale: scaleLinear().domain(domain), grid: true, axis: { ticks: { values: ticks } } },
      },
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return <TanChart definition={definition} width={width} height={height} ariaLabel="Candlestick chart" />;
}

export default { settleMode: 'raf' as const, Chart };
