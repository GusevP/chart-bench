import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveStepAfter } from '@visx/curve';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleLinear } from '@visx/scale';
import { Area, Bar, Circle, Line, LinePath } from '@visx/shape';
import { TooltipWithBounds, defaultStyles, useTooltip } from '@visx/tooltip';
import { bisector, extent, max } from 'd3-array';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type {
  Arm,
  ScatterChartProps,
  ScatterPoint,
  SurvivalChartProps,
  SurvivalPoint,
} from '../../data/contract';
import { MARGIN } from '../../data/spec';

const AXIS_COLOR = '#999';
const tickLabel = { fill: '#555', fontSize: 11 };
const tooltipStyle = { ...defaultStyles, fontSize: 12, lineHeight: 1.4 };

const byX = bisector<SurvivalPoint, number>(p => p.x).right;

type SurvivalTip = { day: number; rows: { id: string; color: string; y: number }[] };

function Survival({ width, height, series }: SurvivalChartProps) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const xScale = useMemo(
    () => scaleLinear<number>({ domain: [0, max(series, s => s.points.at(-1)?.x) ?? 1], range: [0, innerW] }),
    [series, innerW],
  );
  const yScale = useMemo(() => scaleLinear<number>({ domain: [0, 1], range: [innerH, 0] }), [innerH]);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } =
    useTooltip<SurvivalTip>();

  const onMove = (event: MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const day = xScale.invert(point.x - MARGIN.left);
    const rows = series.map(s => ({
      id: s.id,
      color: s.color,
      y: s.points[Math.max(0, byX(s.points, day) - 1)]?.y ?? 1,
    }));
    showTooltip({ tooltipData: { day, rows }, tooltipLeft: point.x, tooltipTop: point.y });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={innerW} stroke="#eee" numTicks={6} />
          {series.map(s => (
            <Group key={s.id}>
              <Area<SurvivalPoint>
                data={s.points}
                x={p => xScale(p.x)}
                y0={p => yScale(p.lower)}
                y1={p => yScale(p.upper)}
                curve={curveStepAfter}
                fill={s.color}
                fillOpacity={0.15}
              />
              <LinePath<SurvivalPoint>
                data={s.points}
                x={p => xScale(p.x)}
                y={p => yScale(p.y)}
                curve={curveStepAfter}
                stroke={s.color}
                strokeWidth={1.5}
              />
              {s.points
                .filter(p => p.censored)
                .map(p => (
                  <Line
                    key={p.x}
                    from={{ x: xScale(p.x), y: yScale(p.y) - 4 }}
                    to={{ x: xScale(p.x), y: yScale(p.y) + 4 }}
                    stroke={s.color}
                  />
                ))}
            </Group>
          ))}
          <AxisBottom
            top={innerH}
            scale={xScale}
            numTicks={8}
            label="Days"
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
            labelProps={tickLabel}
          />
          <AxisLeft
            scale={yScale}
            numTicks={6}
            label="Survival"
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
            labelProps={tickLabel}
          />
          {tooltipOpen && tooltipData && (
            <Line
              from={{ x: xScale(tooltipData.day), y: 0 }}
              to={{ x: xScale(tooltipData.day), y: innerH }}
              stroke="#888"
              strokeDasharray="3 3"
              pointerEvents="none"
            />
          )}
          <Bar
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={hideTooltip}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div>Day {Math.round(tooltipData.day)}</div>
          {tooltipData.rows.map(r => (
            <div key={r.id} style={{ color: r.color }}>
              {r.id}: {r.y.toFixed(3)}
            </div>
          ))}
        </TooltipWithBounds>
      )}
    </div>
  );
}

type ScatterTip = { id: string; color: string; p: ScatterPoint };

const HOVER_RADIUS = 20;

function Scatter({ width, height, series }: ScatterChartProps) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const all = useMemo(() => series.flatMap(s => s.points), [series]);
  const xScale = useMemo(() => {
    const [lo = 0, hi = 1] = extent(all, p => p.x);
    return scaleLinear<number>({ domain: [lo, hi], range: [0, innerW], nice: true });
  }, [all, innerW]);
  const yScale = useMemo(() => {
    const [lo = 0, hi = 1] = extent(all, p => p.y);
    return scaleLinear<number>({ domain: [lo, hi], range: [innerH, 0], nice: true });
  }, [all, innerH]);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } =
    useTooltip<ScatterTip>();

  // ponytail: O(n) scan per mousemove; @visx/voronoi isn't installed, use it (or a quadtree) if heavy hover lags.
  const onMove = (event: MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const mx = point.x - MARGIN.left;
    const my = point.y - MARGIN.top;
    let best: ScatterTip | null = null;
    let bestD = HOVER_RADIUS ** 2;
    for (const s of series) {
      for (const p of s.points) {
        const d = (xScale(p.x) - mx) ** 2 + (yScale(p.y) - my) ** 2;
        if (d < bestD) [bestD, best] = [d, { id: s.id, color: s.color, p }];
      }
    }
    if (!best) return hideTooltip();
    showTooltip({
      tooltipData: best,
      tooltipLeft: xScale(best.p.x) + MARGIN.left,
      tooltipTop: yScale(best.p.y) + MARGIN.top,
    });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={innerW} stroke="#eee" numTicks={6} />
          {series.map(s => (
            <Group key={s.id} fill={s.color} fillOpacity={0.7}>
              {s.points.map((p, i) => (
                <Circle key={i} cx={xScale(p.x)} cy={yScale(p.y)} r={p.size} />
              ))}
            </Group>
          ))}
          <AxisBottom
            top={innerH}
            scale={xScale}
            numTicks={8}
            label="X"
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
            labelProps={tickLabel}
          />
          <AxisLeft
            scale={yScale}
            numTicks={6}
            label="Y"
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
            labelProps={tickLabel}
          />
          <Bar
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={onMove}
            onMouseLeave={hideTooltip}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <span style={{ color: tooltipData.color }}>{tooltipData.id}</span>: ({tooltipData.p.x.toFixed(1)},{' '}
          {tooltipData.p.y.toFixed(1)})
        </TooltipWithBounds>
      )}
    </div>
  );
}

export const arm: Arm = { settleMode: 'raf', Survival, Scatter };
