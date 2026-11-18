import {
  CrossPointMarker,
  CursorModifier,
  EAutoRange,
  ELineType,
  EllipsePointMarker,
  FadeAnimation,
  FastBandRenderableSeries,
  FastBubbleRenderableSeries,
  FastLineRenderableSeries,
  NumberRange,
  SweepAnimation,
  XyDataSeries,
  XyScatterRenderableSeries,
  XyyDataSeries,
  XyzDataSeries,
} from 'scichart';
import type { SeriesInfo } from 'scichart';
import { SciChartReact } from 'scichart-react';

import type { Arm, ScatterChartProps, ScatterPoint, SurvivalChartProps } from '../../data/contract';
import { EFFECTS } from '../../data/effects';
import { createSurface, dataKey, niceRange, settleOnFirstFrame } from './surface';

class CensorTickMarker extends CrossPointMarker {
  override drawSprite(
    context: CanvasRenderingContext2D,
    _width: number,
    height: number,
    stroke: string,
    thickness: number,
  ) {
    const x = context.canvas.width / 2;
    const y = context.canvas.height / 2;
    context.strokeStyle = stroke;
    context.lineWidth = thickness;
    context.beginPath();
    context.moveTo(x, y - height / 2);
    context.lineTo(x, y + height / 2);
    context.stroke();
  }
}

const animation = () => (EFFECTS ? new SweepAnimation({ duration: 500 }) : undefined);

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const initChart = async (root: string | HTMLDivElement) => {
    const { sciChartSurface, wasmContext, xAxis, yAxis } = await createSurface(root, { xTitle: 'Days', yTitle: 'Survival', yPrecision: 1 });
    xAxis.visibleRange = new NumberRange(0, Math.max(0, ...series.map(s => s.points.at(-1)?.x ?? 0)));
    xAxis.autoRange = EAutoRange.Never;
    yAxis.visibleRange = new NumberRange(0, 1);
    yAxis.autoRange = EAutoRange.Never;

    const byName = new Map(series.map(s => [s.id, s.points]));
    const lines = series.flatMap(s => {
      const xValues = s.points.map(p => p.x);
      const sorted = { dataIsSortedInX: true, containsNaN: false };
      const censored = s.points.filter(p => p.censored);
      const line = new FastLineRenderableSeries(wasmContext, {
        dataSeries: new XyDataSeries(wasmContext, {
          dataSeriesName: s.id,
          xValues,
          yValues: s.points.map(p => p.y),
          ...sorted,
        }),
        stroke: s.color,
        strokeThickness: 1.5,
        lineType: ELineType.Digital,
        animation: animation(),
      });
      sciChartSurface.renderableSeries.add(
        new FastBandRenderableSeries(wasmContext, {
          dataSeries: new XyyDataSeries(wasmContext, {
            xValues,
            yValues: s.points.map(p => p.upper),
            y1Values: s.points.map(p => p.lower),
            ...sorted,
          }),
          isDigitalLine: true,
          fill: `${s.color}26`,
          fillY1: `${s.color}26`,
          strokeThickness: 0,
          animation: animation(),
        }),
        line,
        new XyScatterRenderableSeries(wasmContext, {
          dataSeries: new XyDataSeries(wasmContext, {
            xValues: censored.map(p => p.x),
            yValues: censored.map(p => p.y),
            ...sorted,
          }),
          pointMarker: new CensorTickMarker(wasmContext, {
            width: 3,
            height: 9,
            stroke: s.color,
            strokeThickness: 1,
          }),
          animation: animation(),
        }),
      );
      return [line];
    });

    // hitTestXSlice returns the nearest point; step-after needs the last one at or before the pointer.
    const stepValue = (info: SeriesInfo) => {
      const points = byName.get(info.seriesName)!;
      const index = info.xValue > info.hitTestPointValues.x ? info.dataSeriesIndex - 1 : info.dataSeriesIndex;
      return points[Math.max(0, index)]!.y;
    };
    sciChartSurface.chartModifiers.add(
      new CursorModifier({
        showTooltip: true,
        includedSeriesIds: lines.map(l => l.id),
        showYLine: false,
        showAxisLabels: false,
        tooltipDataTemplate: infos => [
          `Day ${Math.round(infos[0]?.hitTestPointValues.x ?? 0)}`,
          ...infos.map(info => `${info.seriesName}: ${stepValue(info).toFixed(3)}`),
        ],
      }),
    );
    settleOnFirstFrame(sciChartSurface, onSettled);
    return { sciChartSurface };
  };

  return <SciChartReact key={dataKey(series)} initChart={initChart} style={{ width, height }} />;
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const initChart = async (root: string | HTMLDivElement) => {
    const { sciChartSurface, wasmContext, xAxis, yAxis } = await createSurface(root, { xTitle: 'X', yTitle: 'Y' });
    const all: ScatterPoint[] = series.flatMap(s => s.points);
    xAxis.visibleRange = niceRange(
      wasmContext,
      all.map(p => p.x),
    );
    xAxis.autoRange = EAutoRange.Never;
    yAxis.visibleRange = niceRange(
      wasmContext,
      all.map(p => p.y),
    );
    yAxis.autoRange = EAutoRange.Never;

    const markerSize = 2 * all.reduce((m, p) => Math.max(m, p.size), 0);
    for (const s of series) {
      sciChartSurface.renderableSeries.add(
        new FastBubbleRenderableSeries(wasmContext, {
          dataSeries: new XyzDataSeries(wasmContext, {
            dataSeriesName: s.id,
            xValues: s.points.map(p => p.x),
            yValues: s.points.map(p => p.y),
            zValues: s.points.map(p => p.size * 2),
            containsNaN: false,
          }),
          pointMarker: new EllipsePointMarker(wasmContext, {
            width: markerSize,
            height: markerSize,
            fill: s.color,
            strokeThickness: 0,
            opacity: 0.7,
          }),
          animation: EFFECTS ? new FadeAnimation({ duration: 500 }) : undefined,
        }),
      );
    }

    sciChartSurface.chartModifiers.add(
      new CursorModifier({
        showTooltip: true,
        hitTestRadius: 20,
        showXLine: false,
        showYLine: false,
        showAxisLabels: false,
        tooltipDataTemplate: infos => {
          let best: SeriesInfo | undefined;
          for (const info of infos) if (info.isHit && (!best || info.distance < best.distance)) best = info;
          return best ? [`${best.seriesName}: (${best.xValue.toFixed(1)}, ${best.yValue.toFixed(1)})`] : [];
        },
      }),
    );
    settleOnFirstFrame(sciChartSurface, onSettled);
    return { sciChartSurface };
  };

  return <SciChartReact key={dataKey(series)} initChart={initChart} style={{ width, height }} />;
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
