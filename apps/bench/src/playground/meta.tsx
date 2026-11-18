import type { ReactNode } from 'react';

import type { ChartKind } from '../data/contract';
import agcharts from './logos/agcharts.png';
import apex from './logos/apex.svg';
import chartjs from './logos/chartjs.png';
import echarts from './logos/echarts.png';
import highcharts from './logos/highcharts.png';
import nivo from './logos/nivo.png';
import plotly from './logos/plotly.png';
import react from './logos/react.svg';
import scichart from './logos/scichart.png';
import tanstack from './logos/tanstack.svg';
import visx from './logos/visx.png';

type Meta = { name: string; renderer: string; logo?: string; mark?: string };

export const META = {
  none: { name: 'No library', renderer: 'React + SVG', logo: react },
  nivo: { name: 'nivo', renderer: 'SVG', logo: nivo },
  recharts: { name: 'Recharts', renderer: 'SVG', mark: 'R' },
  echarts: { name: 'ECharts', renderer: 'Canvas', logo: echarts },
  visx: { name: 'visx', renderer: 'SVG', logo: visx },
  tanstack: { name: 'TanStack Charts', renderer: 'SVG', logo: tanstack },
  chartjs: { name: 'Chart.js', renderer: 'Canvas', logo: chartjs },
  uplot: { name: 'uPlot', renderer: 'Canvas', mark: 'μ' },
  plotly: { name: 'Plotly.js', renderer: 'WebGL + SVG', logo: plotly },
  agcharts: { name: 'AG Charts', renderer: 'Canvas', logo: agcharts },
  apex: { name: 'ApexCharts', renderer: 'SVG', logo: apex },
  scichart: { name: 'SciChart', renderer: 'WebGL', logo: scichart },
  highcharts: { name: 'Highcharts', renderer: 'SVG + WebGL', logo: highcharts },
} satisfies Record<string, Meta>;

export function Logo({ meta }: { meta: Meta }) {
  return (
    <span className="logo" aria-hidden="true">
      {meta.logo ? <img src={meta.logo} alt="" /> : meta.mark}
    </span>
  );
}

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="glyph">
    {children}
  </svg>
);

export const GLYPHS: Record<ChartKind, ReactNode> = {
  survival: svg(<path d="M3 5h5v4h4v3h4v4h5" fill="none" stroke="currentColor" strokeWidth="2" />),
  scatter: svg(
    <g fill="currentColor">
      <circle cx="6" cy="16" r="2" />
      <circle cx="10" cy="10" r="2.5" />
      <circle cx="15" cy="14" r="1.6" />
      <circle cx="18" cy="6" r="2.2" />
    </g>,
  ),
  'stacked-bar': svg(
    <g fill="currentColor">
      <rect x="4" y="12" width="4" height="8" />
      <rect x="10" y="7" width="4" height="13" />
      <rect x="16" y="10" width="4" height="10" />
      <rect x="4" y="9" width="4" height="3" opacity=".45" />
      <rect x="10" y="4" width="4" height="3" opacity=".45" />
      <rect x="16" y="6" width="4" height="4" opacity=".45" />
    </g>,
  ),
  'stacked-area': svg(
    <g fill="currentColor">
      <path d="M3 20V13l5-3 5 2 8-6v14z" opacity=".45" />
      <path d="M3 20v-4l5-2 5 1 8-4v9z" />
    </g>,
  ),
  donut: svg(
    <g fill="none" strokeWidth="4" stroke="currentColor">
      <path d="M12 4a8 8 0 0 1 7.6 10.5" />
      <path d="M18.8 16.2A8 8 0 1 1 12 4" opacity=".45" />
    </g>,
  ),
  radar: svg(
    <g fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l8.5 6.2-3.3 10H6.8L3.5 9.2z" opacity=".45" />
      <path d="M12 7l5 4-2 6H9.5L7 10.5z" fill="currentColor" />
    </g>,
  ),
  combo: svg(
    <g>
      <g fill="currentColor" opacity=".45">
        <rect x="4" y="12" width="3.5" height="8" />
        <rect x="10" y="9" width="3.5" height="11" />
        <rect x="16" y="14" width="3.5" height="6" />
      </g>
      <path d="M3 13l6-6 5 4 7-7" fill="none" stroke="currentColor" strokeWidth="2" />
    </g>,
  ),
  heatmap: svg(
    <g fill="currentColor">
      {[0, 1, 2].flatMap(r =>
        [0, 1, 2].map(c => (
          <rect key={`${r}${c}`} x={4 + c * 5.5} y={4 + r * 5.5} width="5" height="5" opacity={[0.3, 0.6, 1][(r + c * 2) % 3]} />
        )),
      )}
    </g>,
  ),
  treemap: svg(
    <g fill="currentColor">
      <rect x="3" y="3" width="10" height="18" />
      <rect x="14" y="3" width="7" height="10" opacity=".6" />
      <rect x="14" y="14" width="7" height="7" opacity=".35" />
    </g>,
  ),
  sankey: svg(
    <g fill="currentColor">
      <rect x="3" y="4" width="3" height="16" />
      <rect x="18" y="3" width="3" height="8" />
      <rect x="18" y="13" width="3" height="8" />
      <path d="M6 4c6 0 6-1 12-1v8c-6 0-6 2-12 2z" opacity=".45" />
      <path d="M6 13c6 0 6 0 12 0v8c-6 0-6-1-12-1z" opacity=".3" />
    </g>,
  ),
  boxplot: svg(
    <g fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3v5M8 17v4M5 3h6M5 21h6M16 6v3M16 15v3M13 6h6M13 18h6" />
      <rect x="5" y="8" width="6" height="9" fill="currentColor" />
      <rect x="13" y="9" width="6" height="6" />
    </g>,
  ),
  candlestick: svg(
    <g stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3v18M12 6v14M18 4v12" />
      <rect x="4" y="7" width="4" height="9" fill="currentColor" />
      <rect x="10" y="9" width="4" height="7" fill="none" />
      <rect x="16" y="6" width="4" height="6" fill="currentColor" />
    </g>,
  ),
};
