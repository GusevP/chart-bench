import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { base, categoryAxis, valueAxis } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const options = useMemo<Highcharts.Options>(
    () => ({
      ...base(width, height, onSettled),
      xAxis: { ...categoryAxis(data.categories), tickmarkPlacement: 'on' },
      yAxis: valueAxis,
      tooltip: { animation: EFFECTS, shared: true },
      series: data.series.map(
        (s): Highcharts.SeriesAreaOptions => ({
          type: 'area',
          name: s.id,
          color: s.color,
          stacking: 'normal',
          fillOpacity: 1,
          pointPlacement: 'on',
          marker: { enabled: false },
          data: s.values,
        }),
      ),
    }),
    [width, height, data, onSettled],
  );
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
