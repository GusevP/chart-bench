import type { MouseEvent, ReactNode } from 'react';

import { thinTicks } from '../../shared/ticks';
import type { Linear } from './linear';

export function pointer(e: MouseEvent<SVGSVGElement>): [number, number] {
  const box = e.currentTarget.getBoundingClientRect();
  return [e.clientX - box.left, e.clientY - box.top];
}

export function plotPointer(
  e: MouseEvent<SVGSVGElement>,
  [x0, x1]: [number, number],
  [y0, y1]: [number, number],
): [number, number] | null {
  const [px, py] = pointer(e);
  return px >= x0 && px <= x1 && py <= y0 && py >= y1 ? [px, py] : null;
}

const AXIS_TEXT = { fontSize: 11, fill: '#555' };

function XAxis({
  x: [x0, x1],
  y,
  ticks,
}: {
  x: [number, number];
  y: number;
  ticks: { at: number; label: number | string }[];
}) {
  return (
    <g {...AXIS_TEXT}>
      <line x1={x0} x2={x1} y1={y} y2={y} stroke="#999" />
      {ticks.map(t => (
        <g key={t.at} transform={`translate(${t.at},${y})`}>
          <line y2={5} stroke="#999" />
          <text y={18} textAnchor="middle">
            {t.label}
          </text>
        </g>
      ))}
    </g>
  );
}

export function YAxis({ y, x, grid, right }: { y: Linear; x: number; grid?: number; right?: boolean }) {
  const [y0, y1] = y.range;
  const side = right ? 1 : -1;
  return (
    <g {...AXIS_TEXT}>
      <line x1={x} x2={x} y1={y0} y2={y1} stroke="#999" />
      {y.ticks(6).map(t => (
        <g key={t} transform={`translate(${x},${y(t)})`}>
          <line x2={5 * side} stroke="#999" />
          {grid !== undefined && <line x2={grid} stroke="#eee" />}
          <text x={8 * side} dy="0.32em" textAnchor={right ? 'start' : 'end'}>
            {t}
          </text>
        </g>
      ))}
    </g>
  );
}

export function CategoryAxis({
  categories,
  at,
  x,
  y,
}: {
  categories: string[];
  at: (i: number) => number;
  x: [number, number];
  y: number;
}) {
  return <XAxis x={x} y={y} ticks={thinTicks(categories.map((label, i) => ({ at: at(i), label })))} />;
}

export function Axes({ x, y, xLabel, yLabel }: { x: Linear; y: Linear; xLabel: string; yLabel: string }) {
  const [x0, x1] = x.range;
  const [y0, y1] = y.range;
  return (
    <g {...AXIS_TEXT}>
      <XAxis x={x.range} y={y0} ticks={x.ticks(8).map(t => ({ at: x(t), label: t }))} />
      <YAxis y={y} x={x0} grid={x1 - x0} />
      <text x={(x0 + x1) / 2} y={y0 + 34} textAnchor="middle">
        {xLabel}
      </text>
      <text transform={`translate(${x0 - 38},${(y0 + y1) / 2}) rotate(-90)`} textAnchor="middle">
        {yLabel}
      </text>
    </g>
  );
}

export function Tooltip({
  left,
  top,
  width = Infinity,
  height = Infinity,
  children,
}: {
  left: number;
  top: number;
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  const flipX = left > width / 2;
  const flipY = top > height / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: left + (flipX ? -12 : 12),
        top: top + (flipY ? -12 : 12),
        transform: `translate(${flipX ? -100 : 0}%, ${flipY ? -100 : 0}%)`,
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
