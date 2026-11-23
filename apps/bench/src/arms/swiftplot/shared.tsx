import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { animate, plot, tooltip } from 'swiftplot';
import type { Chart, Options, TooltipOptions } from 'swiftplot';

import { EFFECTS } from '../../data/effects';

export type PlotOptions = Omit<Options, 'use' | 'dim'>;

export function column<P>(points: readonly P[], value: (p: P) => number) {
  const out = new Float64Array(points.length);
  for (let i = 0; i < points.length; i++) out[i] = value(points[i]!);
  return out;
}
export const places = (count: number) => Float64Array.from({ length: count }, (_, i) => i);

// plot() reads `use` once, so the tooltip it is given forwards to the one of the latest render.
function live(tip: RefObject<TooltipOptions>): TooltipOptions {
  const now = <M extends TooltipOptions['mode']>(_: M) => tip.current as Extract<TooltipOptions, { mode: M }>;
  return tip.current.mode === 'x'
    ? { mode: 'x', title: x => now('x').title(x), value: y => now('x').value(y) }
    : { mode: 'nearest', text: (...args) => now('nearest').text(...args) };
}

export function Plot({
  options,
  tip,
  onSettled,
}: {
  options: PlotOptions;
  tip: TooltipOptions;
  onSettled: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<Chart | null>(null);
  const latest = useRef(tip);
  useEffect(() => {
    latest.current = tip;
    if (chart.current) chart.current.update(options);
    else
      chart.current = plot(ref.current!, {
        ...options,
        dim: EFFECTS ? 0.3 : 1,
        use: EFFECTS ? [tooltip(live(latest)), animate()] : [tooltip(live(latest))],
      });
    onSettled();
  }, [options, tip, onSettled]);
  useEffect(
    () => () => {
      chart.current?.destroy();
      chart.current = null;
    },
    [],
  );
  return <div ref={ref} />;
}
