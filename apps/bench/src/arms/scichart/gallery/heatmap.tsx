import {
  CursorModifier,
  FadeAnimation,
  HeatmapColorMap,
  UniformHeatmapDataSeries,
  UniformHeatmapRenderableSeries,
} from 'scichart';
import type { HeatmapSeriesInfo } from 'scichart';
import { SciChartReact } from 'scichart-react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { HEAT_RANGE, heatmapDomain } from '../../shared/colorRamp';
import { categoryLabels, createSurface, dataKey, settleOnFirstFrame } from '../surface';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'heatmap'>) {
  const initChart = async (root: string | HTMLDivElement) => {
    const { sciChartSurface, wasmContext, xAxis, yAxis } = await createSurface(root);
    categoryLabels(xAxis, data.xs, -0.5, data.xs.length - 0.5);
    categoryLabels(yAxis, data.ys, -0.5, data.ys.length - 0.5);
    yAxis.flippedCoordinates = true;
    yAxis.drawMajorGridLines = false;

    const [lo, hi] = heatmapDomain(data.values);
    sciChartSurface.renderableSeries.add(
      new UniformHeatmapRenderableSeries(wasmContext, {
        dataSeries: new UniformHeatmapDataSeries(wasmContext, {
          xStart: -0.5,
          xStep: 1,
          yStart: -0.5,
          yStep: 1,
          zValues: data.values,
        }),
        colorMap: new HeatmapColorMap({
          minimum: lo === hi ? lo - 1 : lo,
          maximum: lo === hi ? hi + 1 : hi,
          gradientStops: [
            { offset: 0, color: HEAT_RANGE[0] },
            { offset: 1, color: HEAT_RANGE[1] },
          ],
        }),
        animation: EFFECTS ? new FadeAnimation({ duration: 500 }) : undefined,
      }),
    );

    sciChartSurface.chartModifiers.add(
      new CursorModifier({
        showTooltip: true,
        showXLine: false,
        showYLine: false,
        showAxisLabels: false,
        tooltipDataTemplate: infos => {
          const info = infos[0] as HeatmapSeriesInfo | undefined;
          if (!info?.isWithinDataBounds) return [];
          return [`${data.ys[info.yIndex]} / ${data.xs[info.xIndex]}`, `${info.zValue}`];
        },
      }),
    );
    settleOnFirstFrame(sciChartSurface, onSettled);
    return { sciChartSurface };
  };

  return <SciChartReact key={dataKey(data)} initChart={initChart} style={{ width, height }} />;
}

export default { settleMode: 'signal' as const, Chart };
