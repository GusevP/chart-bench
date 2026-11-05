import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BoxPlot } from '@visx/stats';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { BoxStats } from '../../shared/boxplot';
import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  BOX_OUTLIER_COLOR,
  BOX_OUTLIER_RADIUS,
  BOX_STROKE,
  BOX_STROKE_WIDTH,
  boxPaddingInner,
  boxPaddingOuter,
  boxplotStats,
  boxScale,
} from '../../shared/boxplot';
import { thinTicks } from '../../shared/ticks';
import { AXIS_COLOR, tickLabel, tooltipStyle } from '../shared/style';

const outlierProps = { r: BOX_OUTLIER_RADIUS, fill: BOX_OUTLIER_COLOR, stroke: 'none' };

function Chart({ width, height, data }: GalleryChartProps<'boxplot'>) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const stats = useMemo(() => boxplotStats(data), [data]);
  const ids = useMemo(() => stats.map(s => s.id), [stats]);
  const xScale = useMemo(
    () =>
      scaleBand<string>({
        domain: ids,
        range: [0, innerW],
        paddingInner: boxPaddingInner,
        paddingOuter: boxPaddingOuter,
      }),
    [ids, innerW],
  );
  const { domain, ticks } = useMemo(() => boxScale(stats), [stats]);
  const yScale = useMemo(() => scaleLinear<number>({ domain, range: [innerH, 0] }), [domain, innerH]);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<BoxStats>();

  const onMove = (tip: BoxStats) => (event: MouseEvent<SVGGElement>) => {
    const point = localPoint(event);
    if (point) showTooltip({ tooltipData: tip, tooltipLeft: point.x, tooltipTop: point.y });
  };

  const boxWidth = xScale.bandwidth();
  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={innerW} stroke="#eee" tickValues={ticks} />
          {stats.map(s => {
            const left = xScale(s.id)!;
            const cap = { x1: left, x2: left + boxWidth };
            return (
              <g key={s.id} onMouseMove={onMove(s)} onMouseLeave={hideTooltip}>
                <BoxPlot
                  left={left}
                  boxWidth={boxWidth}
                  valueScale={yScale}
                  min={s.whiskerLow}
                  max={s.whiskerHigh}
                  firstQuartile={s.q1}
                  median={s.median}
                  thirdQuartile={s.q3}
                  fill={s.color}
                  stroke={BOX_STROKE}
                  strokeWidth={BOX_STROKE_WIDTH}
                  rx={0}
                  ry={0}
                  minProps={cap}
                  maxProps={cap}
                  outliers={s.outliers}
                  outlierProps={outlierProps}
                />
              </g>
            );
          })}
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickValues={thinTicks(ids)}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
          />
          <AxisLeft
            scale={yScale}
            tickValues={ticks}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div>{tooltipData.id}</div>
          <div>Whisker high: {tooltipData.whiskerHigh}</div>
          <div>Q3: {tooltipData.q3}</div>
          <div>Median: {tooltipData.median}</div>
          <div>Q1: {tooltipData.q1}</div>
          <div>Whisker low: {tooltipData.whiskerLow}</div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
