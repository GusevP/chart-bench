import {
  AreaSeriesModule,
  BubbleSeriesModule,
  LineSeriesModule,
  ModuleRegistry,
  NumberAxisModule,
} from 'ag-charts-community';
import type {
  AgCartesianChartOptions,
  AgCartesianSeriesOptions,
  AgLineSeriesTooltipRendererParams,
  AgSeriesTooltip,
  AgMarkerShapeFn,
} from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import type { Arm, ScatterChartProps, SurvivalChartProps, SurvivalSeries } from '../../data/contract';
import { MARGIN } from '../../data/spec';
import { base, useSettle } from './shared';

ModuleRegistry.registerModules([LineSeriesModule, AreaSeriesModule, BubbleSeriesModule, NumberAxisModule]);

type Row = Record<string, number>;

const STEP_AFTER = { type: 'step', position: 'end' } as const;

const tick: AgMarkerShapeFn = ({ path, x, y }) => {
  path.moveTo(x, y - 4);
  path.lineTo(x, y + 4);
};

// Shared tooltips group series by identical x, so every series needs a row at every x.
function toWide(series: SurvivalSeries[]): Row[] {
  const xs = [...new Set(series.flatMap(s => s.points.map(p => p.x)))].sort((a, b) => a - b);
  const cursors = series.map(() => -1);
  return xs.map(x => {
    const row: Row = { x };
    series.forEach((s, i) => {
      const pts = s.points;
      let c = cursors[i]!;
      while (c + 1 < pts.length && pts[c + 1]!.x <= x) c++;
      cursors[i] = c;
      const p = pts[c];
      if (!p || x > pts.at(-1)!.x) return;
      row[`y${i}`] = p.y;
      row[`lo${i}`] = p.lower;
      row[`band${i}`] = p.upper - p.lower;
      if (p.censored && p.x === x) row[`c${i}`] = p.y;
    });
    return row;
  });
}

// Area fills win the pointer pick over the lines, and a pick on a series with tooltips disabled
// shows nothing; an empty row keeps the shared tooltip listing the other series instead.
const silent: AgSeriesTooltip<AgLineSeriesTooltipRendererParams<Row>> = {
  renderer: ({ datum }) => ({ heading: `Day ${datum.x}`, data: [] }),
};

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const options = useMemo<AgCartesianChartOptions>(() => {
    const data = toWide(series);
    const seriesOptions: AgCartesianSeriesOptions[] = series.flatMap((s, i): AgCartesianSeriesOptions[] => [
      {
        type: 'area',
        xKey: 'x',
        yKey: `lo${i}`,
        stacked: true,
        stackGroup: s.id,
        interpolation: STEP_AFTER,
        fillOpacity: 0,
        strokeWidth: 0,
        tooltip: silent,
      },
      {
        type: 'area',
        xKey: 'x',
        yKey: `band${i}`,
        stacked: true,
        stackGroup: s.id,
        interpolation: STEP_AFTER,
        fill: s.color,
        fillOpacity: 0.15,
        strokeWidth: 0,
        tooltip: silent,
      },
      {
        type: 'line',
        xKey: 'x',
        yKey: `y${i}`,
        title: s.id,
        interpolation: STEP_AFTER,
        stroke: s.color,
        strokeWidth: 1.5,
        marker: { enabled: false },
        tooltip: {
          renderer: ({ datum }) => ({
            heading: `Day ${datum.x}`,
            data: [{ label: s.id, value: datum[`y${i}`].toFixed(3) }],
          }),
        },
      },
      {
        type: 'line',
        xKey: 'x',
        yKey: `c${i}`,
        strokeWidth: 0,
        marker: { shape: tick, stroke: s.color, strokeWidth: 1, fillOpacity: 0 },
        tooltip: silent,
      },
    ]);
    return {
      ...base(width, height),
      data,
      series: seriesOptions,
      tooltip: { mode: 'shared' },
      axes: {
        x: {
          type: 'number',
          position: 'bottom',
          min: 0,
          max: Math.max(0, ...series.map(s => s.points.at(-1)?.x ?? 0)),
          nice: false,
          thickness: MARGIN.bottom,
          title: { text: 'Days', spacing: 4 },
          gridLine: { enabled: false },
        },
        y: {
          type: 'number',
          position: 'left',
          min: 0,
          max: 1,
          nice: false,
          thickness: MARGIN.left,
          title: { text: 'Survival', spacing: 4 },
        },
      },
    };
  }, [series, width, height]);

  const ref = useSettle(onSettled, options);
  return <AgCharts ref={ref} options={options} />;
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const options = useMemo<AgCartesianChartOptions>(() => {
    let largest = 0;
    for (const s of series) for (const p of s.points) largest = Math.max(largest, p.size);
    return {
      ...base(width, height),
      series: series.map(s => ({
        type: 'bubble',
        data: s.points,
        xKey: 'x',
        yKey: 'y',
        sizeKey: 'size',
        title: s.id,
        sizeDomain: [0, largest],
        minSize: 0,
        maxSize: 2 * largest,
        fill: s.color,
        fillOpacity: 0.7,
        strokeWidth: 0,
        maxRenderedItems: s.points.length,
        tooltip: {
          renderer: ({ datum }) => ({
            data: [{ label: 'x, y', value: `${datum.x.toFixed(1)}, ${datum.y.toFixed(1)}` }],
          }),
        },
      })),
      axes: {
        x: {
          type: 'number',
          position: 'bottom',
          thickness: MARGIN.bottom,
          title: { text: 'X', spacing: 4 },
          gridLine: { enabled: false },
        },
        y: { type: 'number', position: 'left', thickness: MARGIN.left, title: { text: 'Y', spacing: 4 } },
      },
    };
  }, [series, width, height]);

  const ref = useSettle(onSettled, options);
  return <AgCharts ref={ref} options={options} />;
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
