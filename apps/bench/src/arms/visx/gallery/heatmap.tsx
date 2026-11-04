import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { Group } from '@visx/group';
import { HeatmapRect } from '@visx/heatmap';
import { scaleBand } from '@visx/scale';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { heatmapRamp } from '../../shared/colorRamp';
import { thinTicks } from '../../shared/ticks';
import { AXIS_COLOR, tickLabel, tooltipStyle } from '../shared/style';

type Tip = { x: string; y: string; value: number };
type Column = { bins: { count: number }[] };

function Chart({ width, height, data }: GalleryChartProps<'heatmap'>) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const columns = useMemo(
    (): Column[] =>
      data.xs.map((_, i) => ({ bins: data.ys.map((_, j) => ({ count: data.values[j]![i]! })) })),
    [data],
  );
  const ramp = useMemo(() => heatmapRamp(data.values), [data]);
  const xScale = useMemo(() => scaleBand<string>({ domain: data.xs, range: [0, innerW] }), [data, innerW]);
  const yScale = useMemo(() => scaleBand<string>({ domain: data.ys, range: [0, innerH] }), [data, innerH]);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<Tip>();

  const onMove = (tip: Tip) => (event: MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (point) showTooltip({ tooltipData: tip, tooltipLeft: point.x, tooltipTop: point.y });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <HeatmapRect<Column, { count: number }>
            data={columns}
            binWidth={xScale.bandwidth()}
            binHeight={yScale.bandwidth()}
            gap={0}
            xScale={i => xScale(data.xs[i]!) ?? 0}
            yScale={j => yScale(data.ys[j]!) ?? 0}
            colorScale={count => ramp(Number(count))}
          >
            {cells =>
              cells.map(column =>
                column.map(c => (
                  <rect
                    key={`${c.row}-${c.column}`}
                    x={c.x}
                    y={c.y}
                    width={c.width}
                    height={c.height}
                    fill={c.color}
                    shapeRendering="crispEdges"
                    onMouseMove={onMove({ x: data.xs[c.column]!, y: data.ys[c.row]!, value: c.count ?? 0 })}
                    onMouseLeave={hideTooltip}
                  />
                )),
              )
            }
          </HeatmapRect>
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickValues={thinTicks(data.xs)}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
          />
          <AxisLeft
            scale={yScale}
            tickValues={thinTicks(data.ys)}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
          />
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div>
            {tooltipData.y} / {tooltipData.x}
          </div>
          <div>{tooltipData.value}</div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
