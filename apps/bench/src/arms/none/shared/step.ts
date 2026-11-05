type Point = { x: number };

export function stepAfterLine<T extends Point>(points: T[], x: (p: T) => number, y: (p: T) => number) {
  return points.map((p, i) => (i === 0 ? `M${x(p)},${y(p)}` : `H${x(p)}V${y(p)}`)).join('');
}

export function stepAfterArea<T extends Point>(
  points: T[],
  x: (p: T) => number,
  y0: (p: T) => number,
  y1: (p: T) => number,
) {
  if (points.length === 0) return '';
  const last = points.length - 1;
  let d = `${stepAfterLine(points, x, y1)}V${y0(points[last]!)}`;
  for (let i = last - 1; i >= 0; i--) d += `V${y0(points[i]!)}H${x(points[i]!)}`;
  return `${d}Z`;
}

export function stepIndex(points: Point[], at: number) {
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.x <= at) lo = mid + 1;
    else hi = mid;
  }
  return Math.max(0, lo - 1);
}
