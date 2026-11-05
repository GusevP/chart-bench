export function band(count: number, range: [number, number], padding: number) {
  const [r0, r1] = range;
  const step = (r1 - r0) / (count + padding);
  const width = step * (1 - padding);
  const start = (i: number) => r0 + step * (i + padding);
  return {
    range,
    width,
    start,
    center: (i: number) => start(i) + width / 2,
    index: (px: number) => Math.min(count - 1, Math.max(0, Math.floor(((px - r0) / (r1 - r0)) * count))),
  };
}
