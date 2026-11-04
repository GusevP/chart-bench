import {
  Chart as ChartJS,
  Filler,
  LineElement,
  PointElement,
  RadarController,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { color } from 'chart.js/helpers';
import { useMemo } from 'react';
import { Radar } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_RINGS,
  RADAR_STROKE_WIDTH,
  radarMax,
} from '../../shared/radar';
import { useSettlePlugin } from '../shared/chart';

ChartJS.register(RadarController, RadialLinearScale, LineElement, PointElement, Filler, Tooltip);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'radar'>) {
  const plugins = useSettlePlugin<'radar'>(onSettled);
  const chartData = useMemo<ChartData<'radar'>>(
    () => ({
      labels: data.categories,
      datasets: data.series.map((s, i) => ({
        label: s.id,
        data: s.values,
        borderColor: s.color,
        backgroundColor: color(s.color).alpha(RADAR_FILL_OPACITY).rgbString(),
        borderWidth: RADAR_STROKE_WIDTH,
        tension: 0,
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 8,
        fill: true,
        order: -i,
      })),
    }),
    [data],
  );
  const max = useMemo(() => radarMax(data), [data]);
  const options = useMemo<ChartOptions<'radar'>>(
    () => ({
      responsive: false,
      animation: false,
      layout: { padding: MARGIN },
      scales: {
        r: {
          min: 0,
          max,
          startAngle: 0,
          ticks: { display: false, stepSize: max / RADAR_RINGS },
          pointLabels: { display: false },
          grid: { circular: false, color: RADAR_GRID_COLOR, lineWidth: 1 },
          angleLines: { display: true, color: RADAR_GRID_COLOR, lineWidth: 1 },
        },
      },
    }),
    [max],
  );
  return <Radar width={width} height={height} data={chartData} options={options} plugins={plugins} />;
}

export default { settleMode: 'signal' as const, Chart };
