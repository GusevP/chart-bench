import type { MouseEvent, ReactNode } from 'react';

import type { Linear } from './linear';

export function pointer(e: MouseEvent<SVGSVGElement>): [number, number] {
  const box = e.currentTarget.getBoundingClientRect();
  return [e.clientX - box.left, e.clientY - box.top];
}

export function Axes({ x, y, xLabel, yLabel }: { x: Linear; y: Linear; xLabel: string; yLabel: string }) {
  const [x0, x1] = x.range;
  const [y0, y1] = y.range;
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

export function Tooltip({ left, top, children }: { left: number; top: number; children: ReactNode }) {
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
