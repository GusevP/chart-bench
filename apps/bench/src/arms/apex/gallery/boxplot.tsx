import type { ApexAxisChartSeries, ApexOptions } from 'apexcharts';
import 'apexcharts/boxPlot';
import { useMemo } from 'react';
import ApexChart from 'react-apexcharts/core';

import type { GalleryChartProps } from '../../../data/contract';
import {
  BOX_OUTLIER_COLOR,
  BOX_OUTLIER_RADIUS,
  BOX_RATIO,
  BOX_STROKE,
  BOX_STROKE_WIDTH,
  boxScale,
  boxplotStats,
} from '../../shared/boxplot';
import { thinTicks } from '../../shared/ticks';
import { Y_AXIS, Y_LABELS, categoryTooltipX, categoryX, useGalleryOptions } from '../shared/base';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'boxplot'>) {
  const base = useGalleryOptions(onSettled);
  const stats = useMemo(() => boxplotStats(data), [data]);
  const series = useMemo<ApexAxisChartSeries>(
    () => [
      {
        name: 'Box',
        data: stats.map(s => ({
          x: s.id,
          y: [s.whiskerLow, s.q1, s.median, s.q3, s.whiskerHigh],
          fillColor: s.color,
          points: s.outliers,
        })),
      },
    ],
    [stats],
  );
  const options = useMemo<ApexOptions>(() => {
    const { domain, step } = boxScale(stats);
    const ids = stats.map(s => s.id);
    const x = categoryX(ids);
    return {
      ...base,
      chart: { ...base.chart, type: 'boxPlot' },
      stroke: { colors: [BOX_STROKE], width: BOX_STROKE_WIDTH },
      plotOptions: {
        bar: { columnWidth: `${BOX_RATIO * 100}%` },
        boxPlot: {
          points: {
            show: true,
            jitter: 0,
            size: BOX_OUTLIER_RADIUS,
            fillColor: BOX_OUTLIER_COLOR,
            strokeWidth: 0,
            opacity: 1,
            maxPoints: Infinity,
          },
        },
      },
      // `trim` is the only switch that stops the grid shrinking for a wide last label; it would truncate thinned labels.
      xaxis: { ...x, labels: { ...x?.labels, trim: thinTicks(ids).length === ids.length } },
      yaxis: {
        ...Y_AXIS,
        min: domain[0],
        max: domain[1],
        tickAmount: Math.round((domain[1] - domain[0]) / step),
        labels: { ...Y_LABELS, formatter: v => String(+v.toFixed(2)) },
      },
      tooltip: { shared: false, intersect: true, x: categoryTooltipX(ids) },
    };
  }, [base, stats]);
  return <ApexChart type="boxPlot" width={width} height={height} series={series} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
