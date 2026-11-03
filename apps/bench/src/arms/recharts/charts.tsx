import { useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  DefaultTooltipContent,
  Line,
  Scatter as RScatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DotItemDotProps, ScatterShapeProps } from 'recharts';

import type { Arm, ScatterChartProps, SurvivalChartProps, SurvivalSeries } from '../../data/contract';
import { MARGIN } from '../../data/spec';

const AXIS_LABEL = { fill: '#555', fontSize: 11 };
const TICK = { fontSize: 11 };
// Recharts lays axes out inside `margin`, so the axis boxes take MARGIN's left/bottom.
const CHART_MARGIN = { top: MARGIN.top, right: MARGIN.right, left: 0, bottom: 0 };

type Row = { x: number; [key: string]: number | boolean };

// A shared tooltip only lists series that have a datum at the hovered x, so every series gets a
// value in every row: forward-filled (step-after) up to its own last point.
function toWideRows(series: SurvivalSeries[]): Row[] {
  const xs = [...new Set(series.flatMap(s => s.points.map(p => p.x)))].sort((a, b) => a - b);
  const cursors = series.map(() => 0);
  return xs.map(x => {
    const row: Row = { x };
    series.forEach((s, i) => {
      const last = s.points.at(-1);
      if (!last || x < s.points[0]!.x || x > last.x) return;
      let c = cursors[i]!;
      while (s.points[c + 1] && s.points[c + 1]!.x <= x) c++;
      cursors[i] = c;
      const p = s.points[c]!;
      row[`y${i}`] = p.y;
      row[`lo${i}`] = p.lower;
      row[`hi${i}`] = p.upper;
      if (p.x === x && p.censored) row[`c${i}`] = true;
    });
    return row;
  });
}

const censorTick = (flag: string) =>
  function CensorTick({ cx, cy, payload, stroke }: DotItemDotProps) {
    if (!payload[flag] || cx == null || cy == null) return null;
    return <line x1={cx} x2={cx} y1={cy - 4} y2={cy + 4} stroke={stroke} />;
  };

function Survival({ width, height, series }: SurvivalChartProps) {
  const rows = useMemo(() => toWideRows(series), [series]);
  const lastX = rows.at(-1)?.x ?? 1;
  return (
    <ComposedChart width={width} height={height} margin={CHART_MARGIN} data={rows}>
      <CartesianGrid vertical={false} stroke="#eee" />
      <XAxis
        type="number"
        height={MARGIN.bottom}
        dataKey="x"
        domain={[0, lastX]}
        tick={TICK}
        label={{ value: 'Days', position: 'insideBottom', ...AXIS_LABEL }}
      />
      <YAxis
        type="number"
        width={MARGIN.left}
        domain={[0, 1]}
        tick={TICK}
        label={{ value: 'Survival', angle: -90, position: 'insideLeft', ...AXIS_LABEL }}
      />
      <Tooltip
        isAnimationActive={false}
        labelFormatter={x => `Day ${x}`}
        formatter={v => (typeof v === 'number' ? v.toFixed(3) : v)}
      />
      {series.map((s, i) => (
        <Area
          key={`band-${s.id}`}
          dataKey={(r: Row) => [r[`lo${i}`], r[`hi${i}`]]}
          type="stepAfter"
          stroke="none"
          fill={s.color}
          fillOpacity={0.15}
          tooltipType="none"
          activeDot={false}
          isAnimationActive={false}
        />
      ))}
      {series.map((s, i) => (
        <Line
          key={s.id}
          name={s.id}
          dataKey={`y${i}`}
          type="stepAfter"
          stroke={s.color}
          strokeWidth={1.5}
          dot={censorTick(`c${i}`)}
          isAnimationActive={false}
        />
      ))}
    </ComposedChart>
  );
}

function Scatter({ width, height, series }: ScatterChartProps) {
  return (
    <ScatterChart width={width} height={height} margin={CHART_MARGIN}>
      <CartesianGrid vertical={false} stroke="#eee" />
      <XAxis
        type="number"
        height={MARGIN.bottom}
        dataKey="x"
        name="x"
        domain={['auto', 'auto']}
        tick={TICK}
        label={{ value: 'X', position: 'insideBottom', ...AXIS_LABEL }}
      />
      <YAxis
        type="number"
        width={MARGIN.left}
        dataKey="y"
        name="y"
        domain={['auto', 'auto']}
        tick={TICK}
        label={{ value: 'Y', angle: -90, position: 'insideLeft', ...AXIS_LABEL }}
      />
      <Tooltip
        isAnimationActive={false}
        formatter={v => (typeof v === 'number' ? v.toFixed(1) : v)}
        content={props => <DefaultTooltipContent {...props} label={props.payload[0]?.graphicalItemId} />}
      />
      {series.map(s => (
        <RScatter
          key={s.id}
          id={s.id}
          data={s.points}
          fill={s.color}
          isAnimationActive={false}
          shape={({ cx, cy, payload }: ScatterShapeProps) => (
            <circle cx={cx} cy={cy} r={payload.size} fill={s.color} fillOpacity={0.7} />
          )}
        />
      ))}
    </ScatterChart>
  );
}

export const arm: Arm = { settleMode: 'raf', Survival, Scatter };
