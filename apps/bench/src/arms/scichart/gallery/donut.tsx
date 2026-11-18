import { EPieType, PieSegment, SciChartJSLightTheme, SciChartPieSurface, Thickness } from 'scichart';
import { SciChartReact } from 'scichart-react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO } from '../../shared/donut';
import { dataKey } from '../surface';

// SciChartPieSurface hard-codes the outer radius to 0.8 of half the view; radiusAdjustment scales it back.
const PIE_SCALE = 0.8;

function Chart({ width, height, data, onSettled }: GalleryChartProps<'donut'>) {
  const initChart = async (root: string | HTMLDivElement) => {
    const sciChartSurface = await SciChartPieSurface.create(root, {
      theme: new SciChartJSLightTheme(),
      pieType: EPieType.Donut,
      holeRadius: INNER_RATIO / PIE_SCALE,
      animate: EFFECTS,
      showLegend: false,
      padding: new Thickness(MARGIN.top, MARGIN.right, MARGIN.bottom, MARGIN.left),
    });
    // The SVG pie draws synchronously inside `add`; with `animate` it raises `rendered` before any slice exists.
    const handler = () => {
      if (!sciChartSurface.domSvgContainer.querySelector('path')) return;
      sciChartSurface.rendered.unsubscribe(handler);
      onSettled();
    };
    sciChartSurface.rendered.subscribe(handler);
    sciChartSurface.pieSegments.add(
      ...data.slices.map(
        s =>
          new PieSegment({
            text: s.id,
            value: s.value,
            color: s.color,
            showLabel: false,
            radiusAdjustment: 1 / PIE_SCALE,
          }),
      ),
    );
    return { sciChartSurface };
  };

  return <SciChartReact key={dataKey(data)} initChart={initChart} style={{ width, height }} />;
}

export default { settleMode: 'signal' as const, Chart };
