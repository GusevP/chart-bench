import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleLinear, scalePoint } from '@visx/scale';
import { AreaStack } from '@visx/shape';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { AXIS_COLOR, thinTicks, tickLabel, tooltipStyle } from '../shared/style';

type Row = { category: string; [id: string]: number | string };

function Chart({ width, height, data }: GalleryChartProps<'stacked-area'>) {
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = height - MARGIN.top - MARGIN.bottom;
  const rows = useMemo(
    () =>
      data.categories.map(
        (category, i): Row => ({
          category,
          ...Object.fromEntries(data.series.map(s => [s.id, s.values[i]!])),
        }),
      ),
    [data],
  );
  const keys = useMemo(() => data.series.map(s => s.id), [data]);
  const colorById = useMemo(() => new Map(data.series.map(s => [s.id, s.color])), [data]);
  const xScale = useMemo(
    () => scalePoint<string>({ domain: data.categories, range: [0, innerW] }),
    [data, innerW],
  );
  const yScale = useMemo(() => {
    const totals = data.categories.map((_, i) => data.series.reduce((sum, s) => sum + s.values[i]!, 0));
    return scaleLinear<number>({ domain: [0, Math.max(...totals)], range: [innerH, 0], nice: true });
  }, [data, innerH]);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<number>();

  const onMove = (event: MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (!point) return;
    const x = point.x - MARGIN.left;
    const index = Math.min(
      data.categories.length - 1,
      Math.max(0, Math.round((x / innerW) * (data.categories.length - 1))),
    );
    showTooltip({ tooltipData: index, tooltipLeft: point.x, tooltipTop: point.y });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={innerW} stroke="#eee" numTicks={6} />
          <AreaStack<Row, string>
            data={rows}
            keys={keys}
            x={d => xScale(d.data.category) ?? 0}
            y0={d => yScale(d[0])}
            y1={d => yScale(d[1])}
          >
            {({ stacks, path }) =>
              stacks.map(stack => (
                <path
                  key={stack.key}
                  d={path(stack) ?? ''}
                  fill={colorById.get(stack.key)}
                  fillOpacity={1}
                  stroke={colorById.get(stack.key)}
                  strokeWidth={1}
                />
              ))
            }
          </AreaStack>
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickValues={thinTicks(data.categories)}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
          />
          <AxisLeft
            scale={yScale}
            numTicks={6}
            stroke={AXIS_COLOR}
            tickStroke={AXIS_COLOR}
            tickLabelProps={tickLabel}
          />
          <rect width={innerW} height={innerH} fill="transparent" onMouseMove={onMove} onMouseLeave={hideTooltip} />
        </Group>
      </svg>
      {tooltipOpen && tooltipData !== undefined && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div>{data.categories[tooltipData]}</div>
          {data.series.map(s => (
            <div key={s.id} style={{ color: s.color }}>
              {s.id}: {s.values[tooltipData]}
            </div>
          ))}
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
