import {
  CursorModifier,
  EAxisAlignment,
  FastColumnRenderableSeries,
  FastLineRenderableSeries,
  NumericAxis,
  WaveAnimation,
  XyDataSeries,
} from 'scichart';
import { SciChartReact } from 'scichart-react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { niceScale } from '../../shared/boxplot';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import {
  TICKS,
  axisStyle,
  categoryLabels,
  createSurface,
  dataKey,
  fixRange,
  settleOnFirstFrame,
} from '../surface';

const animation = () => (EFFECTS ? new WaveAnimation({ duration: 500 }) : undefined);
const maxOf = (values: number[]) => values.reduce((m, v) => Math.max(m, v), 0) || 1;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const initChart = async (root: string | HTMLDivElement) => {
    const { sciChartSurface, wasmContext, xAxis, yAxis } = await createSurface(root, { right: 0 });
    const n = data.categories.length;
    categoryLabels(xAxis, data.categories, -0.5, n - 0.5);
    const bars = niceScale(0, maxOf(data.bars.values));
    fixRange(yAxis, bars.domain[0], bars.domain[1], bars.step);
    const lineAxis = new NumericAxis(wasmContext, {
      ...axisStyle,
      id: 'line',
      axisAlignment: EAxisAlignment.Right,
      axisThickness: COMBO_RIGHT - TICKS,
      labelPrecision: 0,
      drawMajorGridLines: false,
    });
    const line = niceScale(0, maxOf(data.line.values));
    fixRange(lineAxis, line.domain[0], line.domain[1], line.step);
    sciChartSurface.yAxes.add(lineAxis);

    const xValues = data.categories.map((_, i) => i);
    const sorted = { xValues, dataIsSortedInX: true, containsNaN: false };
    sciChartSurface.renderableSeries.add(
      new FastColumnRenderableSeries(wasmContext, {
        dataSeries: new XyDataSeries(wasmContext, {
          ...sorted,
          dataSeriesName: data.bars.id,
          yValues: data.bars.values,
        }),
        fill: data.bars.color,
        stroke: data.bars.color,
        strokeThickness: 0,
        dataPointWidth: 0.8,
        animation: animation(),
      }),
      new FastLineRenderableSeries(wasmContext, {
        dataSeries: new XyDataSeries(wasmContext, {
          ...sorted,
          dataSeriesName: data.line.id,
          yValues: data.line.values,
        }),
        yAxisId: 'line',
        stroke: data.line.color,
        strokeThickness: COMBO_LINE_WIDTH,
        animation: animation(),
      }),
    );

    sciChartSurface.chartModifiers.add(
      new CursorModifier({
        showTooltip: true,
        showYLine: false,
        showAxisLabels: false,
        tooltipDataTemplate: infos => {
          const i = infos[0]?.dataSeriesIndex;
          if (i === undefined) return [];
          return [
            data.categories[i]!,
            `${data.bars.id}: ${data.bars.values[i]}`,
            `${data.line.id}: ${data.line.values[i]}`,
          ];
        },
      }),
    );
    settleOnFirstFrame(sciChartSurface, onSettled);
    return { sciChartSurface };
  };

  return <SciChartReact key={dataKey(data)} initChart={initChart} style={{ width, height }} />;
}

export default { settleMode: 'signal' as const, Chart };
