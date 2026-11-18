import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { base, categoryAxis, valueAxis } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-bar'>) {
  const options = useMemo<Highcharts.Options>(
    () => ({
      ...base(width, height, onSettled),
      xAxis: categoryAxis(data.categories),
      yAxis: valueAxis,
      series: data.series.map(
        (s): Highcharts.SeriesColumnOptions => ({
          type: 'column',
          name: s.id,
          color: s.color,
          stacking: 'normal',
          groupPadding: 0.1,
          pointPadding: 0,
          borderWidth: 0,
          borderRadius: 0,
          data: s.values,
        }),
      ),
    }),
    [width, height, data, onSettled],
  );
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
