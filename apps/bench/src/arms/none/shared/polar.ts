import { MARGIN } from '../../../data/spec';

export const TAU = 2 * Math.PI;

const point = (r: number, a: number): [number, number] => [r * Math.sin(a), -r * Math.cos(a)];

export const plotCentre = (width: number, height: number): [number, number] => [
  MARGIN.left + (width - MARGIN.left - MARGIN.right) / 2,
  MARGIN.top + (height - MARGIN.top - MARGIN.bottom) / 2,
];

export function polar(dx: number, dy: number) {
  const a = Math.atan2(dx, -dy);
  return { angle: a < 0 ? a + TAU : a, r: Math.hypot(dx, dy) };
}

// Each ring is two arcs: a single arc over a full turn has equal endpoints, which SVG draws as nothing.
export function arcPath(inner: number, outer: number, start: number, end: number) {
  const mid = (start + end) / 2;
  const arc = (r: number, a: number, sweep: number) => `A${r},${r} 0 0 ${sweep} ${point(r, a)}`;
  return [
    `M${point(outer, start)}`,
    arc(outer, mid, 1),
    arc(outer, end, 1),
    `L${point(inner, end)}`,
    arc(inner, mid, 0),
    arc(inner, start, 0),
    'Z',
  ].join(' ');
}

export const polygonPoints = (radii: number[]) => radii.map((r, i) => point(r, (i * TAU) / radii.length));
