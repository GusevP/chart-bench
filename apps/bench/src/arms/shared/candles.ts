import type { Candles } from '../../data/contract';
import { niceScale } from './boxplot';

export const CANDLE_UP = '#1a9850';
export const CANDLE_DOWN = '#d73027';
export const CANDLE_RATIO = 0.6;
export const CANDLE_STROKE_WIDTH = 1;

export type Candle = Candles['candles'][number];

export const isUp = (c: Candle) => c.close >= c.open;
export const candleColor = (c: Candle) => (isUp(c) ? CANDLE_UP : CANDLE_DOWN);

export const candleScale = (candles: Candle[]) =>
  niceScale(Math.min(...candles.map(c => c.low)), Math.max(...candles.map(c => c.high)));

export const candlePaddingInner = 1 - CANDLE_RATIO;
export const candlePaddingOuter = candlePaddingInner / 2;
