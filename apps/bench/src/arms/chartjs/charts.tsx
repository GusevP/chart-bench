import {
  Chart as ChartJS,
  Filler,
  Interaction,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import type {
  ChartData,
  ChartOptions,
  ChartType,
  InteractionItem,
  InteractionModeFunction,
  Plugin,
  Scale,
  TooltipPositionerFunction,
} from 'chart.js';
import { color } from 'chart.js/helpers';
import { useMemo, useRef, useState } from 'react';
import { Line, Scatter as ScatterChart } from 'react-chartjs-2';

import type { Arm, ScatterChartProps, SurvivalChartProps } from '../../data/contract';
import { MARGIN } from '../../data/spec';

declare module 'chart.js' {
  interface InteractionModeMap {
    stepX: InteractionModeFunction;
  }
  interface TooltipPositionerMap {
    pointer: TooltipPositionerFunction<ChartType>;
  }
}

// The built-in 'index'/'x' modes match by data index or point hit-box; our series have
// different x grids, so each one needs the last step at or before the pointer.
Interaction.modes.stepX = (chart, e) => {
  const items: InteractionItem[] = [];
  const px = e.x;
  if (px === null) return items;
  chart.data.datasets.forEach((dataset, datasetIndex) => {
    if (!dataset.label || !chart.isDatasetVisible(datasetIndex)) return;
    const points = chart.getDatasetMeta(datasetIndex).data;
    let lo = 0;
    let hi = points.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (points[mid]!.x <= px) lo = mid + 1;
      else hi = mid;
    }
    const index = Math.max(0, lo - 1);
    const element = points[index];
    if (element) items.push({ element, datasetIndex, index });
  });
  return items;
};

Tooltip.positioners.pointer = (_items, eventPosition) => eventPosition;

ChartJS.register(LinearScale, PointElement, LineElement, Filler, Tooltip);

const withAlpha = (c: string, alpha: number) => color(c).alpha(alpha).rgbString();

// Fixing the axis boxes reproduces MARGIN exactly; Chart.js otherwise sizes them from tick labels.
const fixWidth = (scale: Scale) => {
  scale.width = MARGIN.left;
};
const fixHeight = (scale: Scale) => {
  scale.height = MARGIN.bottom;
};

function useSettlePlugin<T extends ChartType>(onSettled: () => void): Plugin<T>[] {
  const [plugins] = useState(() => {
    let done = false;
    const plugin: Plugin<T> = {
      id: 'benchSettled',
      afterRender: () => {
        if (done) return;
        done = true;
        onSettled();
      },
    };
    return [plugin];
  });
  return plugins;
}

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const plugins = useSettlePlugin<'line'>(onSettled);
  const hoverX = useRef(0);

  const data = useMemo<ChartData<'line'>>(
    () => ({
      datasets: series.flatMap(s => [
        {
          label: s.id,
          data: s.points,
          borderColor: s.color,
          backgroundColor: s.color,
          borderWidth: 1.5,
          stepped: 'before',
          pointRadius: 0,
        },
        {
          data: s.points.filter(p => p.censored),
          showLine: false,
          pointStyle: 'line',
          rotation: 90,
          pointRadius: 4,
          pointBorderColor: s.color,
          pointBorderWidth: 1,
        },
        {
          data: s.points.map(p => ({ x: p.x, y: p.upper })),
          stepped: 'before',
          borderWidth: 0,
          pointRadius: 0,
          backgroundColor: withAlpha(s.color, 0.15),
          fill: '+1',
        },
        {
          data: s.points.map(p => ({ x: p.x, y: p.lower })),
          stepped: 'before',
          borderWidth: 0,
          pointRadius: 0,
        },
      ]),
    }),
    [series],
  );

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: false,
      animation: false,
      parsing: false,
      normalized: true,
      layout: { padding: { top: MARGIN.top, right: MARGIN.right } },
      onHover: (event, _active, chart) => {
        if (event.x !== null) hoverX.current = chart.scales.x!.getValueForPixel(event.x) ?? 0;
      },
      interaction: { mode: 'stepX', intersect: false },
      scales: {
        x: {
          type: 'linear',
          min: 0,
          max: Math.max(0, ...series.map(s => s.points.at(-1)?.x ?? 0)),
          title: { display: true, text: 'Days' },
          grid: { drawOnChartArea: false },
          afterFit: fixHeight,
        },
        y: {
          type: 'linear',
          min: 0,
          max: 1,
          title: { display: true, text: 'Survival' },
          afterFit: fixWidth,
        },
      },
      plugins: {
        tooltip: {
          position: 'pointer',
          callbacks: {
            title: () => `Day ${Math.round(hoverX.current)}`,
            label: item => `${item.dataset.label}: ${item.parsed.y?.toFixed(3)}`,
          },
        },
      },
    }),
    [series],
  );

  return <Line width={width} height={height} data={data} options={options} plugins={plugins} />;
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const plugins = useSettlePlugin<'scatter'>(onSettled);

  const data = useMemo<ChartData<'scatter'>>(
    () => ({
      datasets: series.map(s => {
        const radii = s.points.map(p => p.size);
        return {
          label: s.id,
          data: s.points,
          backgroundColor: withAlpha(s.color, 0.7),
          borderWidth: 0,
          pointRadius: radii,
          pointHoverRadius: radii,
        };
      }),
    }),
    [series],
  );

  const options = useMemo<ChartOptions<'scatter'>>(
    () => ({
      responsive: false,
      animation: false,
      parsing: false,
      normalized: true,
      layout: { padding: { top: MARGIN.top, right: MARGIN.right } },
      interaction: { mode: 'nearest', intersect: false },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'X' },
          grid: { drawOnChartArea: false },
          afterFit: fixHeight,
        },
        y: { type: 'linear', title: { display: true, text: 'Y' }, afterFit: fixWidth },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: item =>
              `${item.dataset.label}: (${item.parsed.x?.toFixed(1)}, ${item.parsed.y?.toFixed(1)})`,
          },
        },
      },
    }),
    [],
  );

  return <ScatterChart width={width} height={height} data={data} options={options} plugins={plugins} />;
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
