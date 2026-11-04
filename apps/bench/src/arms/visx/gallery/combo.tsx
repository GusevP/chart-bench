import { AxisBottom, AxisLeft, AxisRight } from '@visx/axis';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar, LinePath } from '@visx/shape';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { thinTicks } from '../../shared/ticks';
import { AXIS_COLOR, tickLabel, tooltipStyle } from '../shared/style';

function Chart({ width, height, data }: GalleryChartProps<'combo'>) {
  const innerW = width - MARGIN.left - COMBO_RIGHT;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const xScale = useMemo(
    () => scaleBand<string>({ domain: data.categories, range: [0, innerW], padding: 0.2 }),
    [data, innerW],
  );
  const barScale = useMemo(
    () => scaleLinear<number>({ domain: [0, Math.max(...data.bars.values)], range: [innerH, 0], nice: true }),
    [data, innerH],
  );
  const lineScale = useMemo(
    () => scaleLinear<number>({ domain: [0, Math.max(...data.line.values)], range: [innerH, 0], nice: true }),
    [data, innerH],
  );
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<number>();

  const onMove = (event: MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const index = Math.min(
      data.categories.length - 1,
      Math.max(0, Math.floor(((point.x - MARGIN.left) / innerW) * data.categories.length)),
    );
    showTooltip({ tooltipData: index, tooltipLeft: point.x, tooltipTop: point.y });
  };

  const half = xScale.bandwidth() / 2;
  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={barScale} width={innerW} stroke="#eee" numTicks={6} />
          {data.categories.map((category, i) => {
            const y = barScale(data.bars.values[i]!);
            return (
              <Bar
                key={category}
                x={xScale(category)}
                y={y}
                width={xScale.bandwidth()}
                height={innerH - y}
                fill={data.bars.color}
              />
            );
          })}
          <LinePath
            data={data.categories}
            x={c => (xScale(c) ?? 0) + half}
            y={(_, i) => lineScale(data.line.values[i]!)}
            stroke={data.line.color}
            strokeWidth={COMBO_LINE_WIDTH}
            fill="none"
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickValues={thinTicks(data.categories)}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
          />
          <AxisLeft
            scale={barScale}
            numTicks={6}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
          />
          <AxisRight
            left={innerW}
            scale={lineScale}
            numTicks={6}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={{ ...tickLabel, textAnchor: 'start' }}
          />
          <rect width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={hideTooltip} />
        </Group>
      </svg>
      {tooltipOpen && tooltipData !== undefined && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div>{data.categories[tooltipData]}</div>
          <div style={{ color: data.bars.color }}>
            {data.bars.id}: {data.bars.values[tooltipData]}
          </div>
          <div style={{ color: data.line.color }}>
            {data.line.id}: {data.line.values[tooltipData]}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
