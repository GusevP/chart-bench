import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  CANDLE_STROKE_WIDTH,
  candleColor,
  candlePaddingInner,
  candlePaddingOuter,
  candleScale,
} from '../../shared/candles';
import { CategoryAxis, YAxis } from '../shared/Axes';
import { Tooltip, plotPointer } from '../shared/Chart';
import { band } from '../shared/band';
import { linear } from '../shared/linear';

function Chart({ width, height, data }: GalleryChartProps<'candlestick'>) {
  const { candles } = data;
  const [hover, setHover] = useState<{ i: number; left: number; top: number } | null>(null);
  const ts = useMemo(() => candles.map(c => c.t), [candles]);
  const x = useMemo(
    () => band(candles.length, [MARGIN.left, width - MARGIN.right], candlePaddingInner, candlePaddingOuter),
    [candles, width],
  );
  const { domain, ticks } = useMemo(() => candleScale(candles), [candles]);
  const y = useMemo(() => linear(domain, [height - MARGIN.bottom, MARGIN.top]), [domain, height]);
  const marks = useMemo(
    () =>
      candles.map((c, i) => {
        const left = x.start(i);
        const top = y(Math.max(c.open, c.close));
        const bottom = y(Math.min(c.open, c.close));
        const color = candleColor(c);
        return (
          <path
            key={c.t}
            d={`M${x.center(i)},${y(c.high)}V${y(c.low)}M${left},${top}h${x.width}V${bottom}H${left}Z`}
            fill={color}
            stroke={color}
          />
        );
      }),
    [candles, x, y],
  );

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const p = plotPointer(e, x.range, y.range);
    setHover(p && { i: x.index(p[0]), left: p[0], top: p[1] });
  };

  const c = hover && candles[hover.i]!;
  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <YAxis y={y} x={x.range[0]} grid={x.range[1] - x.range[0]} ticks={ticks} />
        <g strokeWidth={CANDLE_STROKE_WIDTH}>{marks}</g>
        <CategoryAxis categories={ts} at={x.center} x={x.range} y={y.range[0]} />
      </svg>
      {hover && c && (
        <Tooltip left={hover.left} top={hover.top} width={width} height={height}>
          <div>{c.t}</div>
          <div>Open: {c.open}</div>
          <div>High: {c.high}</div>
          <div>Low: {c.low}</div>
          <div>Close: {c.close}</div>
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
