import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

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
import { base, categoryAxis, valueAxis } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'boxplot'>) {
  const options = useMemo<Highcharts.Options>(() => {
    const stats = boxplotStats(data);
    const { domain, step } = boxScale(stats);
    return {
      ...base(width, height, onSettled),
      xAxis: categoryAxis(stats.map(s => s.id)),
      yAxis: { ...valueAxis, min: domain[0], max: domain[1], tickInterval: step, startOnTick: false, endOnTick: false },
      series: [
        {
          type: 'boxplot',
          color: BOX_STROKE,
          lineWidth: BOX_STROKE_WIDTH,
          groupPadding: (1 - BOX_RATIO) / 2,
          pointPadding: 0,
          whiskerLength: '100%',
          tooltip: { valueDecimals: 2 },
          data: stats.map(s => ({
            name: s.id,
            low: s.whiskerLow,
            q1: s.q1,
            median: s.median,
            q3: s.q3,
            high: s.whiskerHigh,
            fillColor: s.color,
          })),
        },
        {
          type: 'scatter',
          color: BOX_OUTLIER_COLOR,
          enableMouseTracking: false,
          marker: { symbol: 'circle', radius: BOX_OUTLIER_RADIUS, lineWidth: 0 },
          data: stats.flatMap((s, i) => s.outliers.map(v => [i, v])),
        },
      ],
    };
  }, [width, height, data, onSettled]);
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
