import Plotly from 'plotly.js-dist-min';
import type { Config, Data, Layout, PlotlyHTMLElement } from 'plotly.js-dist-min';
import { useEffect, useRef } from 'react';

import { MARGIN } from '../../../data/spec';
import { thinTicks } from '../../shared/ticks';

export type Figure = { data: Data[]; layout: Partial<Layout> };

const config: Partial<Config> = { displayModeBar: false, responsive: false };

export const baseLayout = (width: number, height: number, margin: Partial<typeof MARGIN> = {}): Partial<Layout> => {
  const m = { ...MARGIN, ...margin };
  return {
    width,
    height,
    autosize: false,
    margin: { l: m.left, r: m.right, t: m.top, b: m.bottom, pad: 0 },
    showlegend: false,
  };
};

export const axis = {
  automargin: false,
  ticks: 'outside',
  showline: true,
  zeroline: false,
} as const;

export const categoryAxis = (categories: string[]) =>
  ({
    ...axis,
    type: 'category',
    showgrid: false,
    tickangle: 0,
    tickmode: 'array',
    tickvals: thinTicks(categories),
  }) as const;

// Plotly parses colours with tinycolor, which takes #rrggbbaa but not CSS color-mix().
export const withAlpha = (hex: string, alpha: number) =>
  hex + Math.round(alpha * 255).toString(16).padStart(2, '0');

type PlotProps = {
  figure: Figure;
  onSettled: () => void;
  /** Runs once, after the first draw, when `el.on` exists. */
  init?: (el: PlotlyHTMLElement) => void;
};

export function Plot({ figure, onSettled, init }: PlotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const settled = useRef(onSettled);
  settled.current = onSettled;
  const pendingInit = useRef(init);
  useEffect(() => {
    let live = true;
    void Plotly.react(ref.current!, figure.data, figure.layout, config).then(el => {
      pendingInit.current?.(el);
      pendingInit.current = undefined;
      if (live) settled.current();
    });
    return () => {
      live = false;
    };
  }, [figure]);
  useEffect(() => {
    const el = ref.current!;
    return () => Plotly.purge(el);
  }, []);
  return <div ref={ref} />;
}
