import type { ApexOptions } from 'apexcharts';
import 'apexcharts/donut';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO, donutRadius } from '../../shared/donut';
import { useGalleryOptions } from '../shared/base';

// A donut's grid is a min(width, height) square centred in the SVG, minus this padding.
const PLOT_PADDING = { top: MARGIN.top, right: MARGIN.right - 6, bottom: MARGIN.bottom, left: MARGIN.left - 6 };

function Chart({ width, height, data, onSettled }: GalleryChartProps<'donut'>) {
  const base = useGalleryOptions(onSettled, PLOT_PADDING);
  const series = useMemo(() => data.slices.map(s => s.value), [data]);
  const options = useMemo<ApexOptions>(() => {
    const plotHeight = height - MARGIN.top - MARGIN.bottom;
    return {
      ...base,
      chart: { ...base.chart, type: 'donut', dropShadow: { enabled: false, blur: 0 } },
      labels: data.slices.map(s => s.id),
      colors: data.slices.map(s => s.color),
      stroke: { width: 0 },
      plotOptions: {
        pie: {
          expandOnClick: false,
          // ApexCharts' radius is gridHeight / 2.05; scale it to the shared radius.
          customScale: (2.05 * donutRadius(width, height)) / plotHeight,
          donut: { size: `${INNER_RATIO * 100}%`, labels: { show: false } },
        },
      },
      tooltip: { fillSeriesColor: false },
    };
  }, [base, data, width, height]);
  return <ApexChart type="donut" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
