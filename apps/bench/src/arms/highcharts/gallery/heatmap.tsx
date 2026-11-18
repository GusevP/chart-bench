import Highcharts from 'highcharts';
import 'highcharts/modules/heatmap';
import 'highcharts/modules/boost';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { HEAT_RANGE, heatmapDomain } from '../../shared/colorRamp';
import { base, categoryAxis } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'heatmap'>) {
  const options = useMemo<Highcharts.Options>(() => {
    const [lo, hi] = heatmapDomain(data.values);
    return {
      ...base(width, height, onSettled),
      xAxis: { ...categoryAxis(data.xs), lineWidth: 0 },
      yAxis: {
        ...categoryAxis(data.ys),
        reversed: true,
        title: { text: undefined },
        startOnTick: false,
        endOnTick: false,
        gridLineWidth: 0,
        lineWidth: 1,
        tickWidth: 1,
      },
      colorAxis: {
        min: lo === hi ? lo - 1 : lo,
        max: lo === hi ? hi + 1 : hi,
        minColor: HEAT_RANGE[0],
        maxColor: HEAT_RANGE[1],
      },
      tooltip: {
        animation: EFFECTS,
        formatter() {
          return `${data.ys[this.y!]} / ${data.xs[this.x]}<br/>${this.value}`;
        },
      },
      series: [
        {
          type: 'heatmap',
          borderWidth: 0,
          data: data.values.flatMap((row, j) => row.map((v, i) => [i, j, v])),
        },
      ],
    };
  }, [width, height, data, onSettled]);
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
