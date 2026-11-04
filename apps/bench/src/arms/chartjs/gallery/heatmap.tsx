import { CategoryScale, Chart as ChartJS, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions, Scale } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import { useMemo } from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { heatmapRamp } from '../../shared/heatmap';
import { thinTicks } from '../../shared/ticks';
import { fixHeight, fixWidth, useSettlePlugin } from '../shared/chart';

ChartJS.register(CategoryScale, MatrixController, MatrixElement, Tooltip);

type Cell = { x: string; y: string; v: number };

const thin = (labels: string[]) => {
  const shown = new Set(thinTicks(labels));
  return (scale: Scale) => {
    scale.ticks = scale.ticks.filter(t => shown.has(labels[t.value]!));
  };
};

function Chart({ width, height, data, onSettled }: GalleryChartProps<'heatmap'>) {
  const plugins = useSettlePlugin<'matrix'>(onSettled);
  const chartData = useMemo<ChartData<'matrix', Cell[]>>(() => {
    const ramp = heatmapRamp(data.values);
    const cellWidth = (width - MARGIN.left - MARGIN.right) / data.xs.length;
    const cellHeight = (height - MARGIN.top - MARGIN.bottom) / data.ys.length;
    return {
      datasets: [
        {
          data: data.ys.flatMap((y, j) => data.xs.map((x, i) => ({ x, y, v: data.values[j]![i]! }))),
          backgroundColor: ctx => ramp((ctx.raw as Cell).v),
          // One pixel of overlap hides canvas antialiasing seams between fractional cells.
          width: cellWidth + 1,
          height: cellHeight + 1,
        },
      ],
    };
  }, [data, width, height]);
  const options = useMemo<ChartOptions<'matrix'>>(
    () => ({
      responsive: false,
      animation: false,
      layout: { padding: { top: MARGIN.top, right: MARGIN.right } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: () => '',
            label: ctx => `${(ctx.raw as Cell).y} / ${(ctx.raw as Cell).x}: ${(ctx.raw as Cell).v}`,
          },
        },
      },
      scales: {
        x: {
          type: 'category',
          labels: data.xs,
          offset: true,
          grid: { display: false },
          ticks: { autoSkip: false, maxRotation: 0 },
          afterBuildTicks: thin(data.xs),
          afterFit: fixHeight,
        },
        y: {
          type: 'category',
          labels: data.ys,
          offset: true,
          reverse: false,
          grid: { display: false },
          ticks: { autoSkip: false },
          afterBuildTicks: thin(data.ys),
          afterFit: fixWidth,
        },
      },
    }),
    [data],
  );
  return (
    <ReactChart
      type="matrix"
      width={width}
      height={height}
      data={chartData}
      options={options}
      plugins={plugins}
    />
  );
}

export default { settleMode: 'signal' as const, Chart };
