import type Highcharts from 'highcharts';

import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { thinTicks } from '../../shared/ticks';

export const base = (
  width: number,
  height: number,
  onSettled: () => void,
  margin = MARGIN,
): Highcharts.Options => ({
  chart: {
    width,
    height,
    margin: [margin.top, margin.right, margin.bottom, margin.left],
    animation: EFFECTS,
    events: { render: onSettled },
  },
  title: { text: undefined },
  legend: { enabled: false },
  tooltip: { animation: EFFECTS },
  plotOptions: {
    series: {
      animation: EFFECTS,
      states: { hover: { enabled: EFFECTS }, inactive: { enabled: EFFECTS } },
    },
  },
});

export const valueAxis: Highcharts.YAxisOptions = {
  title: { text: undefined },
  lineWidth: 1,
  tickWidth: 1,
  reversedStacks: false,
};

export const categoryAxis = (categories: string[]): Highcharts.XAxisOptions => ({
  categories,
  tickPositions: thinTicks(categories.map((_, i) => i)),
  labels: { rotation: 0, overflow: 'allow', style: { whiteSpace: 'nowrap' } },
});
