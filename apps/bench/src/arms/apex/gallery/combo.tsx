import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/bar';
import 'apexcharts/line';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { GALLERY_PADDING, Y_AXIS, Y_LABELS, categoryTooltipX, categoryX, useGalleryOptions } from '../shared/base';

const PADDING = { ...GALLERY_PADDING, left: GALLERY_PADDING.left! + 28, right: COMBO_RIGHT - 58 };

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const base = useGalleryOptions(onSettled, PADDING);
  const series = useMemo<ApexAxisChartSeries>(
    () => [
      { name: data.bars.id, type: 'column', color: data.bars.color, data: data.bars.values },
      { name: data.line.id, type: 'line', color: data.line.color, data: data.line.values },
    ],
    [data],
  );
  const options = useMemo<ApexOptions>(
    () => ({
      ...base,
      chart: { ...base.chart, type: 'line' },
      plotOptions: { bar: { columnWidth: '80%' } },
      stroke: { width: [0, COMBO_LINE_WIDTH] },
      markers: { size: 0, hover: { size: 0 } },
      xaxis: categoryX(data.categories),
      yaxis: [
        { ...Y_AXIS, seriesName: data.bars.id, min: 0, labels: Y_LABELS },
        {
          seriesName: data.line.id,
          opposite: true,
          min: 0,
          axisBorder: { show: true },
          axisTicks: { show: true },
          labels: { minWidth: 30, maxWidth: 30 },
        },
      ],
      tooltip: { shared: true, intersect: false, x: categoryTooltipX(data.categories) },
    }),
    [base, data],
  );
  return <ApexChart type="line" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
