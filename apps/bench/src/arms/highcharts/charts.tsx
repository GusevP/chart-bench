import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import 'highcharts/modules/boost';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type {
  Arm,
  ScatterChartProps,
  SurvivalPoint,
  SurvivalSeries,
  SurvivalChartProps,
} from '../../data/contract';
import { EFFECTS } from '../../data/effects';
import { MARGIN } from '../../data/spec';

Highcharts.SVGRenderer.prototype.symbols.vline = (x: number, y: number, w: number, h: number) => [
  ['M', x + w / 2, y],
  ['L', x + w / 2, y + h],
];

const base = (width: number, height: number, onSettled: () => void): Highcharts.Options => ({
  chart: {
    width,
    height,
    margin: [MARGIN.top, MARGIN.right, MARGIN.bottom, MARGIN.left],
    animation: EFFECTS,
    events: { render: onSettled },
  },
  title: { text: undefined },
  legend: { enabled: false },
  tooltip: { animation: EFFECTS },
  plotOptions: {
    series: {
      animation: EFFECTS,
      states: { hover: { enabled: EFFECTS }, inactive: { enabled: EFFECTS } },
    },
  },
});

const stepValue = (points: SurvivalPoint[], at: number) => {
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.x <= at) lo = mid + 1;
    else hi = mid;
  }
  return points[Math.max(0, lo - 1)]?.y;
};

const survivalTooltip = (series: SurvivalSeries[], x: number) =>
  [
    `Day ${Math.round(x)}`,
    ...series.map(s => `<span style="color:${s.color}">${s.id}</span>: ${stepValue(s.points, x)?.toFixed(3)}`),
  ].join('<br/>');

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const options = useMemo<Highcharts.Options>(
    () => ({
      ...base(width, height, onSettled),
      xAxis: {
        min: 0,
        max: Math.max(0, ...series.map(s => s.points.at(-1)?.x ?? 0)),
        title: { text: 'Days', y: -6 },
      },
      yAxis: { min: 0, max: 1, title: { text: 'Survival' }, lineWidth: 1, tickWidth: 1 },
      tooltip: {
        animation: EFFECTS,
        shared: true,
        formatter() {
          return survivalTooltip(series, this.x);
        },
      },
      series: series.flatMap((s): Highcharts.SeriesOptionsType[] => [
        {
          type: 'arearange',
          step: 'left',
          color: s.color,
          fillOpacity: 0.15,
          lineWidth: 0,
          enableMouseTracking: false,
          data: s.points.map(p => [p.x, p.lower, p.upper]),
        },
        {
          type: 'line',
          name: s.id,
          step: 'left',
          color: s.color,
          lineWidth: 1.5,
          marker: { enabled: false },
          data: s.points.map(p => [p.x, p.y]),
        },
        {
          type: 'scatter',
          enableMouseTracking: false,
          marker: { symbol: 'vline', radius: 4, lineWidth: 1, lineColor: s.color },
          data: s.points.filter(p => p.censored).map(p => [p.x, p.y]),
        },
      ]),
    }),
    [width, height, series, onSettled],
  );
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const options = useMemo<Highcharts.Options>(
    () => ({
      ...base(width, height, onSettled),
      xAxis: { title: { text: 'X', y: -6 }, startOnTick: true, endOnTick: true },
      yAxis: { title: { text: 'Y' }, lineWidth: 1, tickWidth: 1 },
      tooltip: {
        animation: EFFECTS,
        headerFormat: '',
        pointFormat: '<span style="color:{series.color}">{series.name}</span>: ({point.x:.1f}, {point.y:.1f})',
      },
      series: series.map(
        (s): Highcharts.SeriesScatterOptions => ({
          type: 'scatter',
          name: s.id,
          color: s.color,
          marker: { symbol: 'circle', fillColor: Highcharts.color(s.color).setOpacity(0.7).get() },
          data: s.points.map(p => ({ x: p.x, y: p.y, marker: { radius: p.size } })),
        }),
      ),
    }),
    [width, height, series, onSettled],
  );
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
