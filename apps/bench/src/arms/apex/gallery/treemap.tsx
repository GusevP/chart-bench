import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/treemap';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { treeLeaves, treemapRamp } from '../../shared/treemap';
import { useGalleryOptions } from '../shared/base';

const PLOT_PADDING = { top: MARGIN.top - 21, right: MARGIN.right, bottom: MARGIN.bottom, left: MARGIN.left };

function Chart({ width, height, data, onSettled }: GalleryChartProps<'treemap'>) {
  const base = useGalleryOptions(onSettled, PLOT_PADDING);
  const series = useMemo<ApexAxisChartSeries>(() => {
    const ramp = treemapRamp(data);
    return (data.children ?? [data]).map(group => ({
      name: group.id,
      data: treeLeaves(group).map(l => ({ x: l.id, y: l.value, fillColor: ramp(l.value) })),
    }));
  }, [data]);
  const options = useMemo<ApexOptions>(
    () => ({
      ...base,
      chart: { ...base.chart, type: 'treemap' },
      stroke: { width: 0 },
      plotOptions: { treemap: { enableShades: false, borderRadius: 0, seriesTitle: { show: false } } },
      tooltip: { shared: false, intersect: true },
    }),
    [base],
  );
  return <ApexChart type="treemap" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
