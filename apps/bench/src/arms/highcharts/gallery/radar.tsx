import Highcharts from 'highcharts';
import 'highcharts/highcharts-more';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_STROKE_WIDTH,
  radarMax,
  radarRadius,
  radarRings,
} from '../../shared/radar';
import { base } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'radar'>) {
  const options = useMemo<Highcharts.Options>(() => {
    const max = radarMax(data);
    const options = base(width, height, onSettled);
    return {
      ...options,
      chart: { ...options.chart, polar: true },
      pane: { size: 2 * radarRadius(width, height), startAngle: 0 },
      xAxis: {
        categories: data.categories,
        tickmarkPlacement: 'on',
        lineWidth: 0,
        gridLineColor: RADAR_GRID_COLOR,
        labels: { enabled: false },
      },
      yAxis: {
        gridLineInterpolation: 'polygon',
        gridLineColor: RADAR_GRID_COLOR,
        min: 0,
        max,
        tickPositions: [0, ...radarRings(max)],
        title: { text: undefined },
        labels: { enabled: false },
      },
      tooltip: { animation: EFFECTS, shared: true },
      series: data.series.map(
        (s): Highcharts.SeriesAreaOptions => ({
          type: 'area',
          name: s.id,
          color: s.color,
          fillOpacity: RADAR_FILL_OPACITY,
          pointPlacement: 'on',
          lineWidth: RADAR_STROKE_WIDTH,
          marker: { enabled: false },
          data: s.values,
        }),
      ),
    };
  }, [width, height, data, onSettled]);
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
