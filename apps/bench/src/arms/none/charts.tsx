import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { Arm, ScatterChartProps, ScatterPoint, SurvivalChartProps } from '../../data/contract';
import { MARGIN } from '../../data/spec';
import { Axes, Tooltip, pointer } from './shared/Chart';
import { linear } from './shared/linear';
import { stepAfterArea, stepAfterLine, stepIndex } from './shared/step';

const extent = (pts: ScatterPoint[], f: (p: ScatterPoint) => number): [number, number] => {
  let lo = Infinity;
  let hi = -Infinity;
  for (const p of pts) {
    const v = f(p);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
};

function Survival({ width, height, series }: SurvivalChartProps) {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const x = useMemo(
    () =>
      linear(
        [0, series.reduce((m, s) => Math.max(m, s.points.at(-1)?.x ?? m), 0) || 1],
        [MARGIN.left, width - MARGIN.right],
      ),
    [series, width],
  );
  const y = useMemo(() => linear([0, 1], [height - MARGIN.bottom, MARGIN.top]), [height]);
  const onMove = (e: MouseEvent<SVGSVGElement>) => setHoverX(x.invert(pointer(e)[0]));
  const hovered = hoverX === null ? [] : series.map(s => ({ s, p: s.points[stepIndex(s.points, hoverX)]! }));

  return (
    <div style={{ position: 'relative' }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHoverX(null)}>
        <Axes x={x} y={y} xLabel="Days" yLabel="Survival" />
        {series.map(s => (
          <g key={s.id}>
            <path
              d={stepAfterArea(
                s.points,
                p => x(p.x),
                p => y(p.lower),
                p => y(p.upper),
              )}
              fill={s.color}
              fillOpacity={0.15}
            />
            <path
              d={stepAfterLine(
                s.points,
                p => x(p.x),
                p => y(p.y),
              )}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
            />
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
      linear(
        extent(all, p => p.x),
        [MARGIN.left, width - MARGIN.right],
      ).nice(),
    [all, width],
  );
  const y = useMemo(
    () =>
      linear(
        extent(all, p => p.y),
        [height - MARGIN.bottom, MARGIN.top],
      ).nice(),
    [all, height],
  );

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const [mx, my] = pointer(e);
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
