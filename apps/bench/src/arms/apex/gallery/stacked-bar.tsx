import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/bar';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import { Y_AXIS, Y_LABELS, categoryTooltipX, categoryX, useGalleryOptions } from '../shared/base';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-bar'>) {
  const base = useGalleryOptions(onSettled);
  const series = useMemo<ApexAxisChartSeries>(
    () => data.series.map(s => ({ name: s.id, color: s.color, data: s.values })),
    [data],
  );
  const options = useMemo<ApexOptions>(
    () => ({
      ...base,
      chart: { ...base.chart, type: 'bar', stacked: true },
      plotOptions: { bar: { columnWidth: '80%' } },
      xaxis: categoryX(data.categories),
      yaxis: { ...Y_AXIS, labels: Y_LABELS },
      tooltip: { shared: false, intersect: true, x: categoryTooltipX(data.categories) },
    }),
    [base, data],
  );
  return <ApexChart type="bar" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
