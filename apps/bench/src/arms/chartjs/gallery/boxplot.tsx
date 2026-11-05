import { BoxAndWiskers, BoxPlotController } from '@sgratzl/chartjs-chart-boxplot';
import { CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { useMemo } from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import {
  BOX_OUTLIER_COLOR,
  BOX_OUTLIER_RADIUS,
  BOX_RATIO,
  BOX_STROKE,
  BOX_STROKE_WIDTH,
  boxplotStats,
  boxScale,
} from '../../shared/boxplot';
import { fixHeight, fixWidth, useSettlePlugin } from '../shared/chart';

ChartJS.register(CategoryScale, LinearScale, BoxPlotController, BoxAndWiskers, Tooltip);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'boxplot'>) {
  const plugins = useSettlePlugin<'boxplot'>(onSettled);
  const stats = useMemo(() => boxplotStats(data), [data]);
  const chartData = useMemo<ChartData<'boxplot'>>(
    () => ({
      labels: stats.map(s => s.id),
      datasets: [
        {
          label: 'Groups',
          clip: false,
          data: stats.map(s => ({
            min: s.min,
            max: s.max,
            q1: s.q1,
            median: s.median,
            q3: s.q3,
            mean: s.mean,
            whiskerMin: s.whiskerLow,
            whiskerMax: s.whiskerHigh,
            items: [],
            outliers: s.outliers,
          })),
          backgroundColor: stats.map(s => s.color),
          borderColor: BOX_STROKE,
          borderWidth: BOX_STROKE_WIDTH,
          categoryPercentage: BOX_RATIO,
          barPercentage: 1,
          meanRadius: 0,
          meanBorderWidth: 0,
          outlierRadius: BOX_OUTLIER_RADIUS,
          outlierBackgroundColor: BOX_OUTLIER_COLOR,
          outlierBorderWidth: 0,
        },
      ],
    }),
    [stats],
  );
  const options = useMemo<ChartOptions<'boxplot'>>(() => {
    const { domain, step } = boxScale(stats);
    return {
      responsive: false,
      animation: EFFECTS ? undefined : false,
      layout: { padding: { top: MARGIN.top, right: MARGIN.right } },
      scales: {
        x: { grid: { drawOnChartArea: false }, ticks: { maxRotation: 0, maxTicksLimit: 12 }, afterFit: fixHeight },
        y: { min: domain[0], max: domain[1], ticks: { stepSize: step }, afterFit: fixWidth },
      },
    };
  }, [stats]);
  return (
    <ReactChart type="boxplot" width={width} height={height} data={chartData} options={options} plugins={plugins} />
  );
}

export default { settleMode: 'signal' as const, Chart };
