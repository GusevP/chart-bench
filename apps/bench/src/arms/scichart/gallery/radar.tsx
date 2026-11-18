import {
  EAutoRange,
  EPolarAxisMode,
  EPolarGridlineMode,
  NumberRange,
  PolarCursorModifier,
  PolarMountainRenderableSeries,
  PolarNumericAxis,
  SciChartJSLightTheme,
  SciChartPolarSurface,
  Thickness,
  WaveAnimation,
  XyDataSeries,
} from 'scichart';
import { SciChartReact } from 'scichart-react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_RINGS,
  RADAR_STROKE_WIDTH,
  radarMax,
} from '../../shared/radar';
import { axisStyle, dataKey, settleOnFirstFrame } from '../surface';

const alpha = Math.round(RADAR_FILL_OPACITY * 255)
  .toString(16)
  .padStart(2, '0');

function Chart({ width, height, data, onSettled }: GalleryChartProps<'radar'>) {
  const initChart = async (root: string | HTMLDivElement) => {
    const { sciChartSurface, wasmContext } = await SciChartPolarSurface.create(root, {
      theme: new SciChartJSLightTheme(),
      padding: new Thickness(MARGIN.top, MARGIN.right, MARGIN.bottom, MARGIN.left),
    });
    const n = data.categories.length;
    const max = radarMax(data);
    const grid = {
      ...axisStyle,
      drawLabels: false,
      drawMajorTickLines: false,
      autoRange: EAutoRange.Never,
      autoTicks: false,
      gridlineMode: EPolarGridlineMode.Polygons,
      majorGridLineStyle: { color: RADAR_GRID_COLOR, strokeThickness: 1 },
    };
    sciChartSurface.xAxes.add(
      new PolarNumericAxis(wasmContext, {
        ...grid,
        polarAxisMode: EPolarAxisMode.Angular,
        visibleRange: new NumberRange(0, n),
        majorDelta: 1,
        minorDelta: 1,
        startAngle: Math.PI / 2,
        flippedCoordinates: true,
      }),
    );
    sciChartSurface.yAxes.add(
      new PolarNumericAxis(wasmContext, {
        ...grid,
        polarAxisMode: EPolarAxisMode.Radial,
        visibleRange: new NumberRange(0, max),
        majorDelta: max / RADAR_RINGS,
        minorDelta: max / RADAR_RINGS,
      }),
    );

    const xValues = Array.from({ length: n + 1 }, (_, i) => i);
    sciChartSurface.renderableSeries.add(
      ...data.series.map(
        s =>
          new PolarMountainRenderableSeries(wasmContext, {
            dataSeries: new XyDataSeries(wasmContext, {
              dataSeriesName: s.id,
              xValues,
              yValues: [...s.values, s.values[0]!],
              dataIsSortedInX: true,
              containsNaN: false,
            }),
            fill: `${s.color}${alpha}`,
            stroke: s.color,
            strokeThickness: RADAR_STROKE_WIDTH,
            animation: EFFECTS ? new WaveAnimation({ duration: 500 }) : undefined,
          }),
      ),
    );

    sciChartSurface.chartModifiers.add(
      new PolarCursorModifier({
        showTooltip: true,
        showAxisLabels: false,
        showCircularLine: false,
        tooltipDataTemplate: infos => {
          const i = infos[0]?.dataSeriesIndex;
          if (i === undefined) return [];
          const k = i % n;
          return [data.categories[k]!, ...data.series.map(s => `${s.id}: ${s.values[k]}`)];
        },
      }),
    );
    settleOnFirstFrame(sciChartSurface, onSettled);
    return { sciChartSurface };
  };

  return <SciChartReact key={dataKey(data)} initChart={initChart} style={{ width, height }} />;
}

export default { settleMode: 'signal' as const, Chart };
