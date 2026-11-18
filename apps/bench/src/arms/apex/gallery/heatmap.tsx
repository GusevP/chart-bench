import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/heatmap';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import { heatmapRamp } from '../../shared/colorRamp';
import { Y_AXIS, Y_LABELS, categoryX, shownOnly, useGalleryOptions } from '../shared/base';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'heatmap'>) {
  const base = useGalleryOptions(onSettled);
  const series = useMemo<ApexAxisChartSeries>(
    () =>
      data.ys
        .map((y, j) => ({ name: y, data: data.xs.map((x, i) => ({ x, y: data.values[j]![i]! })) }))
        .reverse(),
    [data],
  );
  const options = useMemo<ApexOptions>(() => {
    const ramp = heatmapRamp(data.values);
    const yLabel = shownOnly(data.ys);
    // Heatmap cells ignore a datum's fillColor; one colour range per distinct value reproduces the ramp.
    const ranges = [...new Set(data.values.flat())].map(v => ({ from: v, to: v, color: ramp(v) }));
    return {
      ...base,
      chart: { ...base.chart, type: 'heatmap' },
      stroke: { width: 0 },
      plotOptions: { heatmap: { radius: 0, enableShades: false, colorScale: { ranges } } },
      xaxis: categoryX(data.xs),
      yaxis: { ...Y_AXIS, labels: { ...Y_LABELS, formatter: v => yLabel(String(v)) } },
      tooltip: {
        shared: false,
        intersect: true,
        y: { formatter: (v, opts?: { dataPointIndex: number }) => `${data.xs[opts?.dataPointIndex ?? 0]} = ${v}` },
      },
    };
  }, [base, data]);
  return <ApexChart type="heatmap" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
