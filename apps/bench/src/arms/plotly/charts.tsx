import type { Config, Data, Layout } from 'plotly.js';
// @ts-expect-error The dist bundle ships no types; @types/plotly.js describes it under 'plotly.js'.
import PlotlyUntyped from 'plotly.js-gl2d-dist-min';
import { useEffect, useMemo, useRef } from 'react';

import type { Arm, ScatterChartProps, SurvivalChartProps } from '../../data/contract';
import { MARGIN } from '../../data/spec';

const Plotly: typeof import('plotly.js') = PlotlyUntyped;

const config: Partial<Config> = { displayModeBar: false, responsive: false };

const baseLayout = (width: number, height: number): Partial<Layout> => ({
  width,
  height,
  autosize: false,
  margin: { l: MARGIN.left, r: MARGIN.right, t: MARGIN.top, b: MARGIN.bottom, pad: 0 },
  showlegend: false,
});

const axis = {
  automargin: false,
  ticks: 'outside',
  showline: true,
  zeroline: false,
  title: { standoff: 4 },
} as const;

function usePlot(data: Data[], layout: Partial<Layout>, onSettled: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const settled = useRef(onSettled);
  settled.current = onSettled;
  useEffect(() => {
    let live = true;
    void Plotly.react(ref.current!, data, layout, config).then(() => {
      if (live) settled.current();
    });
    return () => {
      live = false;
    };
  }, [data, layout]);
  useEffect(() => {
    const el = ref.current!;
    return () => Plotly.purge(el);
  }, []);
  return ref;
}

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const [data, layout] = useMemo(() => survival(width, height, series), [width, height, series]);
  const ref = usePlot(data, layout, onSettled);
  return <div ref={ref} />;
}

function survival(
  width: number,
  height: number,
  series: SurvivalChartProps['series'],
): [Data[], Partial<Layout>] {
  const data: Data[] = series.flatMap((s): Data[] => {
    const xs = s.points.map(p => p.x);
    const censored = s.points.filter(p => p.censored);
    const back = s.points.toReversed();
    return [
      {
        type: 'scattergl',
        mode: 'lines',
        // scattergl's tonexty draws no band (fill-order bug, see NOTES), so each band is one
        // toself polygon; the lower edge runs backwards with y shifted by one so 'hv' still steps after.
        x: [...xs, ...xs.slice(-1), ...back.map(p => p.x)],
        y: [...s.points.map(p => p.upper), ...back.map(p => p.lower), ...back.slice(-1).map(p => p.lower)],
        line: { shape: 'hv', width: 0 },
        fill: 'toself',
        fillcolor: s.color,
        opacity: 0.15,
        hoverinfo: 'skip',
      },
      {
        type: 'scattergl',
        mode: 'lines',
        name: s.id,
        x: xs,
        y: s.points.map(p => p.y),
        line: { shape: 'hv', width: 1.5, color: s.color },
        hovertemplate: '%{y:.3f}',
      },
      {
        type: 'scattergl',
        mode: 'markers',
        x: censored.map(p => p.x),
        y: censored.map(p => p.y),
        marker: { symbol: 'line-ns-open', size: 5.7, color: s.color, line: { width: 1, color: s.color } },
        hoverinfo: 'skip',
      },
    ];
  });
  const lastX = Math.max(0, ...series.map(s => s.points.at(-1)?.x ?? 0));
  const xaxis = {
    ...axis,
    range: [0, lastX],
    showgrid: false,
    title: { ...axis.title, text: 'Days' },
    unifiedhovertitle: { text: 'Day %{x:.0f}' },
  };
  const layout: Partial<Layout> = {
    ...baseLayout(width, height),
    hovermode: 'x unified',
    xaxis,
    yaxis: { ...axis, range: [0, 1], title: { ...axis.title, text: 'Survival' } },
  };
  return [data, layout];
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const [data, layout] = useMemo(() => scatter(width, height, series), [width, height, series]);
  const ref = usePlot(data, layout, onSettled);
  return <div ref={ref} />;
}

function scatter(
  width: number,
  height: number,
  series: ScatterChartProps['series'],
): [Data[], Partial<Layout>] {
  const data: Data[] = series.map(s => ({
    type: 'scattergl',
    mode: 'markers',
    name: s.id,
    x: s.points.map(p => p.x),
    y: s.points.map(p => p.y),
    marker: { color: s.color, opacity: 0.7, size: s.points.map(p => 2 * p.size), line: { width: 0 } },
    hovertemplate: `${s.id}: (%{x:.1f}, %{y:.1f})<extra></extra>`,
  }));
  const layout: Partial<Layout> = {
    ...baseLayout(width, height),
    hovermode: 'closest',
    xaxis: { ...axis, showgrid: false, title: { ...axis.title, text: 'X' } },
    yaxis: { ...axis, title: { ...axis.title, text: 'Y' } },
  };
  return [data, layout];
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
