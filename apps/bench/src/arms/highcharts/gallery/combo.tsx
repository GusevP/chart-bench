import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { base, categoryAxis, valueAxis } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const options = useMemo<Highcharts.Options>(
    () => ({
      ...base(width, height, onSettled, { ...MARGIN, right: COMBO_RIGHT }),
      xAxis: categoryAxis(data.categories),
      yAxis: [
        { ...valueAxis, min: 0 },
        { ...valueAxis, min: 0, opposite: true, gridLineWidth: 0 },
      ],
      tooltip: { animation: EFFECTS, shared: true },
      series: [
        {
          type: 'column',
          name: data.bars.id,
          color: data.bars.color,
          groupPadding: 0.1,
          pointPadding: 0,
          borderWidth: 0,
          borderRadius: 0,
          data: data.bars.values,
        },
        {
          type: 'line',
          name: data.line.id,
          color: data.line.color,
          yAxis: 1,
          lineWidth: COMBO_LINE_WIDTH,
          marker: { enabled: false },
          data: data.line.values,
        },
      ],
    }),
    [width, height, data, onSettled],
  );
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
