export type Linear = ((v: number) => number) & {
  domain: [number, number];
  range: [number, number];
  invert: (v: number) => number;
  ticks: (count: number) => number[];
  nice: () => Linear;
};

const E10 = Math.sqrt(50);
const E5 = Math.sqrt(10);
const E2 = Math.sqrt(2);

function tickSpec(start: number, stop: number, count: number): [number, number, number] {
  const step = (stop - start) / Math.max(0, count);
  const power = Math.floor(Math.log10(step));
  const error = step / 10 ** power;
  const factor = error >= E10 ? 10 : error >= E5 ? 5 : error >= E2 ? 2 : 1;
  let i1: number;
  let i2: number;
  let inc: number;
  if (power < 0) {
    inc = 10 ** -power / factor;
    i1 = Math.round(start * inc);
    i2 = Math.round(stop * inc);
    if (i1 / inc < start) ++i1;
    if (i2 / inc > stop) --i2;
    inc = -inc;
  } else {
    inc = 10 ** power * factor;
    i1 = Math.round(start / inc);
    i2 = Math.round(stop / inc);
    if (i1 * inc < start) ++i1;
    if (i2 * inc > stop) --i2;
  }
  if (i2 < i1 && count >= 0.5 && count < 2) return tickSpec(start, stop, count * 2);
  return [i1, i2, inc];
}

function ticks(start: number, stop: number, count: number): number[] {
  if (start === stop) return [start];
  if (stop < start) return ticks(stop, start, count).reverse();
  const [i1, i2, inc] = tickSpec(start, stop, count);
  if (!(i2 >= i1)) return [];
  return Array.from({ length: i2 - i1 + 1 }, (_, i) => (inc < 0 ? (i1 + i) / -inc : (i1 + i) * inc));
}

function niceDomain(domain: [number, number], count = 10): [number, number] {
  let [start, stop] = domain;
  if (start === stop) return domain;
  let prev: number | undefined;
  for (let i = 0; i < 10; i++) {
    const inc = tickSpec(start, stop, count)[2];
    if (inc === prev) return [start, stop];
    if (inc > 0) {
      start = Math.floor(start / inc) * inc;
      stop = Math.ceil(stop / inc) * inc;
    } else if (inc < 0) {
      start = Math.ceil(start * inc) / inc;
      stop = Math.floor(stop * inc) / inc;
    } else break;
    prev = inc;
  }
  return domain;
}

export function linear(domain: [number, number], range: [number, number]): Linear {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  const mid = (r0 + r1) / 2;
  const scale = (v: number) => (d1 === d0 ? mid : r0 + (v - d0) * k);
  return Object.assign(scale, {
    domain,
    range,
    invert: (v: number) => (d1 === d0 ? d0 : d0 + (v - r0) / k),
    ticks: (count: number) => ticks(d0, d1, count),
    nice: () => linear(niceDomain(domain), range),
  });
}
