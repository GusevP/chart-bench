import {
  EAutoRange,
  EAxisAlignment,
  NumberRange,
  NumericAxis,
  SciChartJSLightTheme,
  SciChartSurface,
  TextLabelProvider,
  Thickness,
} from 'scichart';
import type { TSciChart } from 'scichart';
import wasmUrl from 'scichart/_wasm/scichart.wasm?url';
import wasmNoSimdUrl from 'scichart/_wasm/scichart-nosimd.wasm?url';

import { MARGIN } from '../../data/spec';

// Explicit URLs keep the files same-origin and hashed under `base: './'`; scichart-react's
// fallback is the root-absolute "/scichart.wasm".
SciChartSurface.configure({ wasmUrl, wasmNoSimdUrl });
SciChartSurface.UseCommunityLicense();

export const TICKS = 5;

export const axisStyle = {
  axisTitleStyle: { fontSize: 12, padding: new Thickness(0, 0, 0, 0) },
  labelStyle: { fontSize: 11 },
  drawMinorGridLines: false,
  drawMinorTickLines: false,
  drawMajorBands: false,
};

export async function createSurface(
  root: string | HTMLDivElement,
  {
    xTitle,
    yTitle,
    yPrecision = 0,
    right = MARGIN.right,
  }: { xTitle?: string; yTitle?: string; yPrecision?: number; right?: number } = {},
) {
  const { sciChartSurface, wasmContext } = await SciChartSurface.create(root, {
    theme: new SciChartJSLightTheme(),
    padding: new Thickness(MARGIN.top, right, 0, 0),
  });
  // axisThickness sizes only the label band; the 5px major ticks, plus a 12px title (11px on x, 9px on y), add to it.
  const xAxis = new NumericAxis(wasmContext, {
    ...axisStyle,
    axisTitle: xTitle,
    axisThickness: MARGIN.bottom - (xTitle ? 16 : TICKS),
    labelPrecision: 0,
    drawMajorGridLines: false,
  });
  const yAxis = new NumericAxis(wasmContext, {
    ...axisStyle,
    axisTitle: yTitle,
    axisAlignment: EAxisAlignment.Left,
    axisThickness: MARGIN.left - (yTitle ? 14 : TICKS),
    labelPrecision: yPrecision,
  });
  sciChartSurface.xAxes.add(xAxis);
  sciChartSurface.yAxes.add(yAxis);
  return { sciChartSurface, wasmContext, xAxis, yAxis };
}

export function fixRange(axis: NumericAxis, lo: number, hi: number, step?: number) {
  axis.visibleRange = new NumberRange(lo, hi);
  axis.autoRange = EAutoRange.Never;
  if (step === undefined) return;
  axis.autoTicks = false;
  axis.majorDelta = step;
  axis.minorDelta = step;
}

export function categoryLabels(axis: NumericAxis, labels: string[], lo: number, hi: number) {
  axis.labelProvider = new TextLabelProvider({ labels });
  fixRange(axis, lo, hi, Math.ceil(labels.length / 12));
}

export function settleOnFirstFrame(surface: SciChartSurface, onSettled: () => void) {
  const handler = (isInvalidated: boolean) => {
    if (isInvalidated) return;
    surface.renderInstructionsCompleted.unsubscribe(handler);
    onSettled();
  };
  surface.renderInstructionsCompleted.subscribe(handler);
}

export function niceRange(wasmContext: TSciChart, values: number[]) {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const delta = wasmContext.NiceDoubleScale.CalculateTickSpacing(lo, hi, 5, 10);
  const major = delta.maxD;
  delta.delete();
  return new NumberRange(Math.floor(lo / major) * major, Math.ceil(hi / major) * major);
}

const keys = new WeakMap<object, number>();
let nextKey = 0;
// ponytail: scichart-react runs initChart once per mount, so new data remounts; in-place dataSeries updates would be cheaper.
export const dataKey = (data: object) => keys.get(data) ?? (keys.set(data, ++nextKey), nextKey);
