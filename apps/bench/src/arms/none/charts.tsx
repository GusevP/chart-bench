import { bisector, extent, max } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import type { ScaleLinear } from 'd3-scale';
import { area, curveStepAfter, line } from 'd3-shape';
import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type {
  Arm,
  ScatterChartProps,
  ScatterPoint,
  SurvivalChartProps,
  SurvivalPoint,
} from '../../data/contract';
import { MARGIN } from '../../data/spec';

function Axes({
  x,
  y,
  xLabel,
  yLabel,
}: {
  x: ScaleLinear<number, number>;
  y: ScaleLinear<number, number>;
  xLabel: string;
  yLabel: string;
}) {
  const [x0, x1] = x.range() as [number, number];
  const [y0, y1] = y.range() as [number, number];
  return (
    <g fontSize={11} fill="#555">
      <line x1={x0} x2={x1} y1={y0} y2={y0} stroke="#999" />
      {x.ticks(8).map(t => (
        <g key={t} transform={`translate(${x(t)},${y0})`}>
          <line y2={5} stroke="#999" />
          <text y={18} textAnchor="middle">
            {t}
          </text>
        </g>
      ))}
      <line x1={x0} x2={x0} y1={y0} y2={y1} stroke="#999" />
      {y.ticks(6).map(t => (
        <g key={t} transform={`translate(${x0},${y(t)})`}>
          <line x2={-5} stroke="#999" />
          <line x2={x1 - x0} stroke="#eee" />
          <text x={-8} dy="0.32em" textAnchor="end">
            {t}
          </text>
        </g>
      ))}
      <text x={(x0 + x1) / 2} y={y0 + 34} textAnchor="middle">
        {xLabel}
      </text>
      <text transform={`translate(${x0 - 38},${(y0 + y1) / 2}) rotate(-90)`} textAnchor="middle">
        {yLabel}
      </text>
    </g>
  );
}

function Tooltip({ left, top, children }: { left: number; top: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: left + 12,
        top: top + 12,
        pointerEvents: 'none',
        background: 'white',
        border: '1px solid #ccc',
        padding: '4px 8px',
        fontSize: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}

const byX = bisector<SurvivalPoint, number>(p => p.x).left;

function Survival({ width, height, series }: SurvivalChartProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const x = useMemo(
    () =>
      scaleLinear()
        .domain([0, max(series, s => s.points.at(-1)?.x) ?? 1])
        .range([MARGIN.left, width - MARGIN.right]),
    [series, width],
  );
  const y = useMemo(
    () =>
      scaleLinear()
        .domain([0, 1])
        .range([height - MARGIN.bottom, MARGIN.top]),
    [height],
  );
  const path = line<SurvivalPoint>()
    .x(p => x(p.x))
    .y(p => y(p.y))
    .curve(curveStepAfter);
  const band = area<SurvivalPoint>()
    .x(p => x(p.x))
    .y0(p => y(p.lower))
    .y1(p => y(p.upper))
    .curve(curveStepAfter);

  const onMove = (e: MouseEvent<SVGSVGElement>) => setHoverX(x.invert(e.nativeEvent.offsetX));
  const hovered =
    hoverX === null ? [] : series.map(s => ({ s, p: s.points[Math.max(0, byX(s.points, hoverX) - 1)]! }));

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHoverX(null)}>
        <Axes x={x} y={y} xLabel="Days" yLabel="Survival" />
        {series.map(s => (
          <g key={s.id}>
            <path d={band(s.points)!} fill={s.color} fillOpacity={0.15} />
            <path d={path(s.points)!} fill="none" stroke={s.color} strokeWidth={1.5} />
            {s.points
              .filter(p => p.censored)
              .map(p => (
                <line key={p.x} x1={x(p.x)} x2={x(p.x)} y1={y(p.y) - 4} y2={y(p.y) + 4} stroke={s.color} />
              ))}
          </g>
        ))}
        {hoverX !== null && (
          <line
            x1={x(hoverX)}
            x2={x(hoverX)}
            y1={MARGIN.top}
            y2={height - MARGIN.bottom}
            stroke="#888"
            strokeDasharray="3 3"
          />
        )}
      </svg>
      {hoverX !== null && (
        <Tooltip left={x(hoverX)} top={MARGIN.top}>
          <div>Day {Math.round(hoverX)}</div>
          {hovered.map(({ s, p }) => (
            <div key={s.id} style={{ color: s.color }}>
              {s.id}: {p.y.toFixed(3)}
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

function Scatter({ width, height, series }: ScatterChartProps) {
  const [hovered, setHovered] = useState<{ id: string; color: string; p: ScatterPoint } | null>(null);
  const all = useMemo(() => series.flatMap(s => s.points), [series]);
  const x = useMemo(
    () =>
      scaleLinear()
        .domain(extent(all, p => p.x) as [number, number])
        .nice()
        .range([MARGIN.left, width - MARGIN.right]),
    [all, width],
  );
  const y = useMemo(
    () =>
      scaleLinear()
        .domain(extent(all, p => p.y) as [number, number])
        .nice()
        .range([height - MARGIN.bottom, MARGIN.top]),
    [all, height],
  );

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const { offsetX: mx, offsetY: my } = e.nativeEvent;
    let best: typeof hovered = null;
    let bestD = 20 ** 2;
    for (const s of series) {
      for (const p of s.points) {
        const d = (x(p.x) - mx) ** 2 + (y(p.y) - my) ** 2;
        if (d < bestD) [bestD, best] = [d, { id: s.id, color: s.color, p }];
      }
    }
    setHovered(best);
  };

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHovered(null)}>
        <Axes x={x} y={y} xLabel="X" yLabel="Y" />
        {series.map(s => (
          <g key={s.id} fill={s.color} fillOpacity={0.7}>
            {s.points.map((p, i) => (
              <circle key={i} cx={x(p.x)} cy={y(p.y)} r={p.size} />
            ))}
          </g>
        ))}
      </svg>
      {hovered && (
        <Tooltip left={x(hovered.p.x)} top={y(hovered.p.y)}>
          <span style={{ color: hovered.color }}>{hovered.id}</span>: ({hovered.p.x.toFixed(1)},{' '}
          {hovered.p.y.toFixed(1)})
        </Tooltip>
      )}
    </div>
  );
}

export const arm: Arm = { settleMode: 'raf', Survival, Scatter };
