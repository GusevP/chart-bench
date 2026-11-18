import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/radar';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_RINGS,
  RADAR_STROKE_WIDTH,
  radarMax,
  radarRadius,
} from '../../shared/radar';
import { useGalleryOptions } from '../shared/base';

const PLOT_PADDING = { top: MARGIN.top - 31, right: MARGIN.right, bottom: MARGIN.bottom - 5, left: MARGIN.left };

function Chart({ width, height, data, onSettled }: GalleryChartProps<'radar'>) {
  const base = useGalleryOptions(onSettled, PLOT_PADDING);
  const series = useMemo<ApexAxisChartSeries>(
    () => data.series.map(s => ({ name: s.id, color: s.color, data: s.values })),
    [data],
  );
  const options = useMemo<ApexOptions>(
    () => ({
      ...base,
      chart: { ...base.chart, type: 'radar' },
      stroke: { width: RADAR_STROKE_WIDTH },
      fill: { type: 'solid', opacity: RADAR_FILL_OPACITY },
      markers: { size: 0 },
      plotOptions: {
        radar: {
          size: radarRadius(width, height),
          polygons: {
            strokeColors: RADAR_GRID_COLOR,
            connectorColors: RADAR_GRID_COLOR,
            fill: { colors: ['transparent'] },
          },
        },
      },
      xaxis: { categories: data.categories, labels: { show: false } },
      yaxis: { show: false, min: 0, max: radarMax(data), tickAmount: RADAR_RINGS },
      tooltip: { shared: false, intersect: true },
    }),
    [base, data, width, height],
  );
  return <ApexChart type="radar" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
