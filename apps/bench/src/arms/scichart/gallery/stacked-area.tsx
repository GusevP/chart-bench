import {
  CursorModifier,
  StackedMountainCollection,
  StackedMountainRenderableSeries,
  WaveAnimation,
  XyDataSeries,
} from 'scichart';
import { SciChartReact } from 'scichart-react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { niceScale } from '../../shared/boxplot';
import { categoryLabels, createSurface, dataKey, fixRange, settleOnFirstFrame } from '../surface';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const initChart = async (root: string | HTMLDivElement) => {
    const { sciChartSurface, wasmContext, xAxis, yAxis } = await createSurface(root);
    const n = data.categories.length;
    categoryLabels(xAxis, data.categories, 0, Math.max(1, n - 1));
    const totals = data.categories.map((_, i) => data.series.reduce((sum, s) => sum + s.values[i]!, 0));
    const { domain, step } = niceScale(0, totals.reduce((m, v) => Math.max(m, v), 0) || 1);
    fixRange(yAxis, domain[0], domain[1], step);

    const xValues = data.categories.map((_, i) => i);
    const collection = new StackedMountainCollection(wasmContext);
    if (EFFECTS) collection.animation = new WaveAnimation({ duration: 500 });
    collection.add(
      ...data.series.map(
        s =>
          new StackedMountainRenderableSeries(wasmContext, {
            dataSeries: new XyDataSeries(wasmContext, {
              dataSeriesName: s.id,
              xValues,
              yValues: s.values,
              dataIsSortedInX: true,
              containsNaN: false,
            }),
            fill: s.color,
            stroke: s.color,
            strokeThickness: 1,
          }),
      ),
    );
    sciChartSurface.renderableSeries.add(collection);

    sciChartSurface.chartModifiers.add(
      new CursorModifier({
        showTooltip: true,
        showYLine: false,
        showAxisLabels: false,
        tooltipDataTemplate: infos => {
          const i = infos[0]?.dataSeriesIndex;
          if (i === undefined) return [];
          return [data.categories[i]!, ...data.series.map(s => `${s.id}: ${s.values[i]}`)];
        },
      }),
    );
    settleOnFirstFrame(sciChartSurface, onSettled);
    return { sciChartSurface };
  };

  return <SciChartReact key={dataKey(data)} initChart={initChart} style={{ width, height }} />;
}

export default { settleMode: 'signal' as const, Chart };
