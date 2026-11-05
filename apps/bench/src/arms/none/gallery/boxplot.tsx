import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { BoxStats } from '../../shared/boxplot';
import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  BOX_OUTLIER_COLOR,
  BOX_OUTLIER_RADIUS,
  BOX_STROKE,
  BOX_STROKE_WIDTH,
  boxPaddingInner,
  boxPaddingOuter,
  boxScale,
  boxplotStats,
} from '../../shared/boxplot';
import { CategoryAxis, Tooltip, YAxis, pointer } from '../shared/Chart';
import { band } from '../shared/band';
import { linear } from '../shared/linear';

function Chart({ width, height, data }: GalleryChartProps<'boxplot'>) {
  const [tip, setTip] = useState<{ left: number; top: number; stats: BoxStats } | null>(null);
  const stats = useMemo(() => boxplotStats(data), [data]);
  const ids = useMemo(() => stats.map(s => s.id), [stats]);
  const x = useMemo(
    () => band(stats.length, [MARGIN.left, width - MARGIN.right], boxPaddingInner, boxPaddingOuter),
    [stats, width],
  );
  const { domain, ticks } = useMemo(() => boxScale(stats), [stats]);
  const y = useMemo(() => linear(domain, [height - MARGIN.bottom, MARGIN.top]), [domain, height]);
  const boxes = useMemo(
    () =>
      stats.map((s, i) => {
        const left = x.start(i);
        const cx = x.center(i);
        const q3 = y(s.q3);
        const q1 = y(s.q1);
        const high = y(s.whiskerHigh);
        const low = y(s.whiskerLow);
        return (
          <g key={s.id}>
            <g fill={BOX_OUTLIER_COLOR}>
              {s.outliers.map((o, k) => (
                <circle key={k} cx={cx} cy={y(o)} r={BOX_OUTLIER_RADIUS} />
              ))}
            </g>
            <path
              d={`M${left},${high}h${x.width}M${cx},${high}V${q3}M${cx},${q1}V${low}M${left},${low}h${x.width}`}
            />
            <rect x={left} y={q3} width={x.width} height={q1 - q3} fill={s.color} />
            <line x1={left} x2={left + x.width} y1={y(s.median)} y2={y(s.median)} />
          </g>
        );
      }),
    [stats, x, y],
  );

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const [px, py] = pointer(e);
    const i = x.index(px);
    const s = stats[i]!;
    const cx = x.center(i);
    const edge = BOX_STROKE_WIDTH / 2;
    const high = y(s.whiskerHigh);
    const low = y(s.whiskerLow);
    const inWidth = Math.abs(px - cx) <= x.width / 2 + edge;
    const hit =
      (inWidth && py >= y(s.q3) - edge && py <= y(s.q1) + edge) ||
      (inWidth && (Math.abs(py - high) <= edge || Math.abs(py - low) <= edge)) ||
      (Math.abs(px - cx) <= edge && py >= high && py <= low) ||
      s.outliers.some(o => Math.hypot(px - cx, py - y(o)) <= BOX_OUTLIER_RADIUS);
    setTip(hit ? { left: px, top: py, stats: s } : null);
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        <YAxis y={y} x={x.range[0]} grid={x.range[1] - x.range[0]} ticks={ticks} />
        <g fill="none" stroke={BOX_STROKE} strokeWidth={BOX_STROKE_WIDTH}>
          {boxes}
        </g>
        <CategoryAxis categories={ids} at={x.center} x={x.range} y={y.range[0]} />
      </svg>
      {tip && (
        <Tooltip left={tip.left} top={tip.top} width={width} height={height}>
          <div>{tip.stats.id}</div>
          <div>Whisker high: {tip.stats.whiskerHigh}</div>
          <div>Q3: {tip.stats.q3}</div>
          <div>Median: {tip.stats.median}</div>
          <div>Q1: {tip.stats.q1}</div>
          <div>Whisker low: {tip.stats.whiskerLow}</div>
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
