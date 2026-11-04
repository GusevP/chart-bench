import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH } from '../../shared/combo';
import { fixHeight, fixWidth, useSettlePlugin } from '../shared/chart';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const plugins = useSettlePlugin<'bar' | 'line'>(onSettled);
  const chartData = useMemo<ChartData<'bar' | 'line'>>(
    () => ({
      labels: data.categories,
      datasets: [
        {
          type: 'line',
          label: data.line.id,
          data: data.line.values,
          yAxisID: 'right',
          borderColor: data.line.color,
          backgroundColor: data.line.color,
          borderWidth: COMBO_LINE_WIDTH,
          pointRadius: 0,
          pointHoverRadius: 0,
          order: 0,
        },
        {
          type: 'bar',
          label: data.bars.id,
          data: data.bars.values,
          yAxisID: 'left',
          backgroundColor: data.bars.color,
          order: 1,
        },
      ],
    }),
    [data],
  );
  const options = useMemo<ChartOptions<'bar' | 'line'>>(
    () => ({
      responsive: false,
      animation: false,
      layout: { padding: { top: MARGIN.top } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { drawOnChartArea: false }, afterFit: fixHeight },
        left: { position: 'left', beginAtZero: true, afterFit: fixWidth },
        right: {
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          afterFit: fixWidth,
        },
      },
    }),
    [],
  );
  return (
    <ReactChart type="bar" width={width} height={height} data={chartData} options={options} plugins={plugins} />
  );
}

export default { settleMode: 'signal' as const, Chart };
