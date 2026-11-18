import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/line';
import 'apexcharts/features/annotations';
import { bisector, extent } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { useMemo, useRef } from 'react';
import type { MouseEvent } from 'react';
import Chart from 'react-apexcharts/core';

import type { Arm, ScatterChartProps, SurvivalChartProps, SurvivalPoint } from '../../data/contract';
import { MARGIN } from '../../data/spec';
import { Y_AXIS, Y_LABELS, useBaseOptions } from './shared/base';

type PointAnnotation = NonNullable<NonNullable<ApexOptions['annotations']>['points']>[number];
// `customSVG` is in ApexCharts' annotation docs and runtime defaults but missing from its .d.ts.
type CensorTick = PointAnnotation & { customSVG: { SVG: string } };

const byX = bisector((p: SurvivalPoint) => p.x).right;

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const base = useBaseOptions(onSettled);
  const hoverX = useRef(0);
  const xMax = useMemo(() => Math.max(0, ...series.map(s => s.points.at(-1)?.x ?? 0)), [series]);

  // Capture phase runs before ApexCharts' own listeners, so tooltip.custom reads this move's x.
  const onMouseMoveCapture = (e: MouseEvent<HTMLDivElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left - MARGIN.left;
    hoverX.current = (px / (width - MARGIN.left - MARGIN.right)) * xMax;
  };

  const chartSeries = useMemo<ApexAxisChartSeries>(
    () => [
      ...series.map(s => ({
        name: `${s.id} band`,
        type: 'rangeArea',
        color: s.color,
        data: s.points,
        parsing: { x: 'x', y: ['lower', 'upper'] },
      })),
      ...series.map(s => ({ name: s.id, type: 'line', color: s.color, data: s.points })),
    ],
    [series],
  );

  const options = useMemo<ApexOptions>(() => {
    const ticks: CensorTick[] = series.flatMap(s =>
      s.points
        .filter(p => p.censored)
        .map(p => ({
          x: p.x,
          y: p.y,
          marker: { size: 0 },
          customSVG: { SVG: `<line y1="-4" y2="4" stroke="${s.color}" />` },
        })),
    );
    return {
      ...base,
      chart: { ...base.chart, type: 'rangeArea' },
      stroke: {
        curve: 'stepline',
        width: series.map(() => 0).concat(series.map(() => 1.5)),
      },
      fill: { opacity: series.map(() => 0.15).concat(series.map(() => 1)) },
      markers: { size: 0, hover: { size: 0 } },
      annotations: { points: ticks },
      xaxis: {
        type: 'numeric',
        min: 0,
        max: xMax,
        title: { text: 'Days' },
        tooltip: { enabled: false },
        crosshairs: { show: false },
      },
      yaxis: {
        ...Y_AXIS,
        min: 0,
        max: 1,
        tickAmount: 5,
        title: { text: 'Survival', offsetX: 2 },
        labels: { ...Y_LABELS, formatter: v => v.toFixed(1) },
      },
      tooltip: {
        shared: true,
        intersect: false,
        custom: () => {
          const x = hoverX.current;
          const rows = series.map(s => {
            const p = s.points[Math.max(0, byX(s.points, x) - 1)];
            return `<div style="color:${s.color}">${s.id}: ${p?.y.toFixed(3)}</div>`;
          });
          return `<div style="padding:6px 8px"><div>Day ${Math.round(x)}</div>${rows.join('')}</div>`;
        },
      },
    };
  }, [base, series, xMax]);

  return (
    <Chart
      type="rangeArea"
      width={width}
      height={height}
      series={chartSeries}
      options={options}
      onMouseMoveCapture={onMouseMoveCapture}
    />
  );
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const base = useBaseOptions(onSettled);
  const chartSeries = useMemo<ApexAxisChartSeries>(
    () => series.map(s => ({ name: s.id, color: s.color, data: s.points, parsing: { x: 'x', y: 'y', z: 'size' } })),
    [series],
  );

  const options = useMemo<ApexOptions>(() => {
    const [lo = 0, hi = 1] = extent(series.flatMap(s => s.points), p => p.x);
    const niceX = scaleLinear().domain([lo, hi]).nice();
    return {
      ...base,
      chart: { ...base.chart, type: 'bubble' },
      markers: { strokeWidth: 0 },
      plotOptions: { bubble: { zScaling: false } },
      fill: { opacity: 0.7 },
      stroke: { width: 0 },
      xaxis: {
        type: 'numeric',
        min: niceX.domain()[0],
        max: niceX.domain()[1],
        tickAmount: niceX.ticks().length - 1,
        title: { text: 'X' },
        labels: { formatter: v => String(Math.round(Number(v))) },
        tooltip: { enabled: false },
      },
      yaxis: {
        ...Y_AXIS,
        title: { text: 'Y', offsetX: 2 },
        labels: { ...Y_LABELS, formatter: v => String(Math.round(v)) },
      },
      tooltip: {
        shared: false,
        intersect: false,
        custom: ({ seriesIndex, dataPointIndex }) => {
          const s = series[seriesIndex]!;
          const p = s.points[dataPointIndex]!;
          return `<div style="padding:6px 8px"><span style="color:${s.color}">${s.id}</span>: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})</div>`;
        },
      },
    };
  }, [base, series]);

  return <Chart type="bubble" width={width} height={height} series={chartSeries} options={options} />;
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
