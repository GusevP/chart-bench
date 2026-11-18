import Highcharts from 'highcharts';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { INNER_RATIO, donutRadius } from '../../shared/donut';
import { base } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'donut'>) {
  const options = useMemo<Highcharts.Options>(() => {
    const size = 2 * donutRadius(width, height);
    return {
      ...base(width, height, onSettled),
      series: [
        {
          type: 'pie',
          size,
          innerSize: size * INNER_RATIO,
          startAngle: 0,
          borderWidth: 0,
          borderRadius: 0,
          dataLabels: { enabled: false },
          data: data.slices.map(s => ({ name: s.id, y: s.value, color: s.color })),
        },
      ],
    };
  }, [width, height, data, onSettled]);
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
