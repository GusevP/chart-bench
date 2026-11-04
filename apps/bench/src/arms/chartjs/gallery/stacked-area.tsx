import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { fixHeight, fixWidth, useSettlePlugin } from '../shared/chart';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const plugins = useSettlePlugin<'line'>(onSettled);
  const chartData = useMemo<ChartData<'line'>>(
    () => ({
      labels: data.categories,
      datasets: data.series.map((s, i) => ({
        label: s.id,
        data: s.values,
        borderColor: s.color,
        backgroundColor: s.color,
        borderWidth: 1,
        pointRadius: 0,
        fill: i === 0 ? 'origin' : '-1',
      })),
    }),
    [data],
  );
  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: false,
      animation: false,
      layout: { padding: { top: MARGIN.top, right: MARGIN.right } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { grid: { drawOnChartArea: false }, afterFit: fixHeight },
        y: { stacked: true, beginAtZero: true, afterFit: fixWidth },
      },
    }),
    [],
  );
  return <Line width={width} height={height} data={chartData} options={options} plugins={plugins} />;
}

export default { settleMode: 'signal' as const, Chart };
