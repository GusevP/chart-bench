import {
  BoxPlotDataSeries,
  CursorModifier,
  EDataPointWidthMode,
  EllipsePointMarker,
  FadeAnimation,
  FastBoxPlotRenderableSeries,
  XyDataSeries,
  XyScatterRenderableSeries,
} from 'scichart';
import { SciChartReact } from 'scichart-react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import {
  BOX_OUTLIER_COLOR,
  BOX_OUTLIER_RADIUS,
  BOX_RATIO,
  BOX_STROKE,
  BOX_STROKE_WIDTH,
  boxplotStats,
  boxScale,
} from '../../shared/boxplot';
import { categoryLabels, createSurface, dataKey, fixRange, settleOnFirstFrame } from '../surface';

const animation = () => (EFFECTS ? new FadeAnimation({ duration: 500 }) : undefined);
const stroke = { stroke: BOX_STROKE, strokeThickness: BOX_STROKE_WIDTH };

function Chart({ width, height, data, onSettled }: GalleryChartProps<'boxplot'>) {
  const initChart = async (root: string | HTMLDivElement) => {
    const { sciChartSurface, wasmContext, xAxis, yAxis } = await createSurface(root);
    const stats = boxplotStats(data);
    categoryLabels(
      xAxis,
      stats.map(s => s.id),
      -0.5,
      stats.length - 0.5,
    );
    const { domain, step } = boxScale(stats);
    fixRange(yAxis, domain[0], domain[1], step);

    stats.forEach((s, i) =>
      sciChartSurface.renderableSeries.add(
        new FastBoxPlotRenderableSeries(wasmContext, {
          dataSeries: new BoxPlotDataSeries(wasmContext, {
            dataSeriesName: s.id,
            xValues: [i],
            maximumValues: [s.whiskerHigh],
            upperQuartileValues: [s.q3],
            medianValues: [s.median],
            lowerQuartileValues: [s.q1],
            minimumValues: [s.whiskerLow],
            dataIsSortedInX: true,
            containsNaN: false,
          }),
          dataPointWidthMode: EDataPointWidthMode.Range,
          dataPointWidth: BOX_RATIO,
          fill: s.color,
          ...stroke,
          whiskers: stroke,
          medianLine: stroke,
          cap: { ...stroke, dataPointWidth: BOX_RATIO },
          animation: animation(),
        }),
      ),
    );
    const outliers = stats.flatMap((s, i) => s.outliers.map(v => [i, v] as const));
    sciChartSurface.renderableSeries.add(
      new XyScatterRenderableSeries(wasmContext, {
        dataSeries: new XyDataSeries(wasmContext, {
          xValues: outliers.map(o => o[0]),
          yValues: outliers.map(o => o[1]),
          dataIsSortedInX: true,
          containsNaN: false,
        }),
        pointMarker: new EllipsePointMarker(wasmContext, {
          width: BOX_OUTLIER_RADIUS * 2,
          height: BOX_OUTLIER_RADIUS * 2,
          fill: BOX_OUTLIER_COLOR,
          strokeThickness: 0,
        }),
        animation: animation(),
      }),
    );

    sciChartSurface.chartModifiers.add(
      new CursorModifier({
        showTooltip: true,
        showXLine: false,
        showYLine: false,
        showAxisLabels: false,
        tooltipDataTemplate: infos => {
          const x = infos[0]?.hitTestPointValues.x;
          if (x === undefined) return [];
          const i = Math.round(x);
          const s = stats[i];
          if (!s || Math.abs(x - i) > BOX_RATIO / 2) return [];
          return [
            s.id,
            `Whisker high: ${s.whiskerHigh}`,
            `Q3: ${s.q3}`,
            `Median: ${s.median}`,
            `Q1: ${s.q1}`,
            `Whisker low: ${s.whiskerLow}`,
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
