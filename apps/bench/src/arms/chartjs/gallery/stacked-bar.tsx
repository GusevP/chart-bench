import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { fixHeight, fixWidth, useSettlePlugin } from '../shared/chart';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-bar'>) {
  const plugins = useSettlePlugin<'bar'>(onSettled);
  const chartData = useMemo<ChartData<'bar'>>(
    () => ({
      labels: data.categories,
      datasets: data.series.map(s => ({ label: s.id, data: s.values, backgroundColor: s.color })),
    }),
    [data],
  );
  const options = useMemo<ChartOptions<'bar'>>(
    () => ({
      responsive: false,
      animation: EFFECTS ? undefined : false,
      layout: { padding: { top: MARGIN.top, right: MARGIN.right } },
      interaction: { mode: 'index', intersect: false },
      scales: {
        x: { stacked: true, grid: { drawOnChartArea: false }, afterFit: fixHeight },
        y: { stacked: true, afterFit: fixWidth },
      },
    }),
    [],
  );
  return <Bar width={width} height={height} data={chartData} options={options} plugins={plugins} />;
}

export default { settleMode: 'signal' as const, Chart };
