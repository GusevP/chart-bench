const LOW = [240, 244, 255] as const;
const HIGH = [8, 48, 107] as const;
export const HEAT_RANGE = [`rgb(${LOW})`, `rgb(${HIGH})`] as [string, string];

export const heatmapDomain = (values: number[][]): [number, number] => {
  let min = Infinity;
  let max = -Infinity;
  for (const row of values)
    for (const v of row) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  return [min, max];
};

// A flat domain maps to the middle of the ramp, as d3's linear scale does.
export const heatmapRamp = (values: number[][]) => {
  const [min, max] = heatmapDomain(values);
  return (value: number) => {
    const t = max > min ? (value - min) / (max - min) : 0.5;
    const [r, g, b] = LOW.map((lo, i) => Math.round(lo + (HIGH[i]! - lo) * t));
    return `rgb(${r},${g},${b})`;
  };
};
