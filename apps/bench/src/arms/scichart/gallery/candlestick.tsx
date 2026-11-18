import { CursorModifier, FadeAnimation, FastCandlestickRenderableSeries, OhlcDataSeries } from 'scichart';
import { SciChartReact } from 'scichart-react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { CANDLE_DOWN, CANDLE_RATIO, CANDLE_STROKE_WIDTH, CANDLE_UP, candleScale } from '../../shared/candles';
import { categoryLabels, createSurface, dataKey, fixRange, settleOnFirstFrame } from '../surface';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'candlestick'>) {
  const initChart = async (root: string | HTMLDivElement) => {
    const { sciChartSurface, wasmContext, xAxis, yAxis } = await createSurface(root);
    const { candles } = data;
    categoryLabels(
      xAxis,
      candles.map(c => c.t),
      -0.5,
      candles.length - 0.5,
    );
    const { domain, step } = candleScale(candles);
    fixRange(yAxis, domain[0], domain[1], step);

    sciChartSurface.renderableSeries.add(
      new FastCandlestickRenderableSeries(wasmContext, {
        dataSeries: new OhlcDataSeries(wasmContext, {
          xValues: candles.map((_, i) => i),
          openValues: candles.map(c => c.open),
          highValues: candles.map(c => c.high),
          lowValues: candles.map(c => c.low),
          closeValues: candles.map(c => c.close),
          dataIsSortedInX: true,
          containsNaN: false,
        }),
        brushUp: CANDLE_UP,
        brushDown: CANDLE_DOWN,
        strokeUp: CANDLE_UP,
        strokeDown: CANDLE_DOWN,
        strokeThickness: CANDLE_STROKE_WIDTH,
        dataPointWidth: CANDLE_RATIO,
        animation: EFFECTS ? new FadeAnimation({ duration: 500 }) : undefined,
      }),
    );

    sciChartSurface.chartModifiers.add(
      new CursorModifier({
        showTooltip: true,
        showAxisLabels: false,
        tooltipDataTemplate: infos => {
          const c = candles[infos[0]?.dataSeriesIndex ?? -1];
          if (!c) return [];
          return [c.t, `Open: ${c.open}`, `High: ${c.high}`, `Low: ${c.low}`, `Close: ${c.close}`];
        },
      }),
    );
    settleOnFirstFrame(sciChartSurface, onSettled);
    return { sciChartSurface };
  };

  return <SciChartReact key={dataKey(data)} initChart={initChart} style={{ width, height }} />;
}

export default { settleMode: 'signal' as const, Chart };
