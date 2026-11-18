import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/area';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import { Y_AXIS, Y_LABELS, categoryTooltipX, categoryX, useGalleryOptions } from '../shared/base';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const base = useGalleryOptions(onSettled);
  const series = useMemo<ApexAxisChartSeries>(
    () => data.series.map(s => ({ name: s.id, color: s.color, data: s.values })),
    [data],
  );
  const options = useMemo<ApexOptions>(
    () => ({
      ...base,
      chart: { ...base.chart, type: 'area', stacked: true },
      stroke: { curve: 'straight', width: 1 },
      markers: { size: 0, hover: { size: 0 } },
      xaxis: { ...categoryX(data.categories), tickPlacement: 'on' },
      yaxis: { ...Y_AXIS, labels: Y_LABELS },
      tooltip: { shared: true, intersect: false, x: categoryTooltipX(data.categories) },
    }),
    [base, data],
  );
  return <ApexChart type="area" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
