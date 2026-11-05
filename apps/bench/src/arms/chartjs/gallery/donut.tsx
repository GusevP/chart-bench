import { ArcElement, Chart as ChartJS, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO } from '../../shared/donut';
import { useSettlePlugin } from '../shared/chart';

ChartJS.register(ArcElement, Tooltip);

const options: ChartOptions<'doughnut'> = {
  responsive: false,
  animation: EFFECTS ? undefined : false,
  layout: { padding: MARGIN },
  cutout: `${INNER_RATIO * 100}%`,
  rotation: 0,
  circumference: 360,
  spacing: 0,
};

function Chart({ width, height, data, onSettled }: GalleryChartProps<'donut'>) {
  const plugins = useSettlePlugin<'doughnut'>(onSettled);
  const chartData = useMemo<ChartData<'doughnut'>>(
    () => ({
      labels: data.slices.map(s => s.id),
      datasets: [
        {
          data: data.slices.map(s => s.value),
          backgroundColor: data.slices.map(s => s.color),
          borderWidth: 0,
          hoverOffset: EFFECTS ? 4 : 0,
        },
      ],
    }),
    [data],
  );
  return <Doughnut width={width} height={height} data={chartData} options={options} plugins={plugins} />;
}

export default { settleMode: 'signal' as const, Chart };
