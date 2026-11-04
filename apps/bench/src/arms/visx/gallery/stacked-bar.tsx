import { AxisBottom, AxisLeft } from '@visx/axis';
import { localPoint } from '@visx/event';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { scaleBand, scaleLinear } from '@visx/scale';
import { BarStack } from '@visx/shape';
import { TooltipWithBounds, useTooltip } from '@visx/tooltip';
import { useMemo } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { AXIS_COLOR, tickLabel, tooltipStyle } from '../shared/style';

type Row = { category: string; [id: string]: number | string };
type Tip = { category: string; id: string; color: string; value: number };

function Chart({ width, height, data }: GalleryChartProps<'stacked-bar'>) {
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
    () => scaleBand<string>({ domain: data.categories, range: [0, innerW], padding: 0.2 }),
    [data, innerW],
  );
  const yScale = useMemo(() => {
    const totals = data.categories.map((_, i) => data.series.reduce((sum, s) => sum + s.values[i]!, 0));
    return scaleLinear<number>({ domain: [0, Math.max(...totals)], range: [innerH, 0], nice: true });
  }, [data, innerH]);
  const tickStep = Math.ceil(data.categories.length / 12);
  const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, showTooltip, hideTooltip } = useTooltip<Tip>();

  const onMove = (tip: Tip) => (event: MouseEvent<SVGRectElement>) => {
    const point = localPoint(event);
    if (point) showTooltip({ tooltipData: tip, tooltipLeft: point.x, tooltipTop: point.y });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows scale={yScale} width={innerW} stroke="#eee" numTicks={6} />
          <BarStack<Row, string>
            data={rows}
            keys={keys}
            x={r => r.category}
            xScale={xScale}
            yScale={yScale}
            color={id => colorById.get(id) ?? 'black'}
          >
            {stacks =>
              stacks.map(stack =>
                stack.bars.map(bar => (
                  <rect
                    key={`${stack.key}-${bar.index}`}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    fill={bar.color}
                    onMouseMove={onMove({
                      category: rows[bar.index]!.category,
                      id: stack.key,
                      color: bar.color,
                      value: rows[bar.index]![stack.key] as number,
                    })}
                    onMouseLeave={hideTooltip}
                  />
                )),
              )
            }
          </BarStack>
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickValues={data.categories.filter((_, i) => i % tickStep === 0)}
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
        </Group>
      </svg>
      {tooltipOpen && tooltipData && (
        <TooltipWithBounds left={tooltipLeft} top={tooltipTop} style={tooltipStyle}>
          <div>{tooltipData.category}</div>
          <div style={{ color: tooltipData.color }}>
            {tooltipData.id}: {tooltipData.value}
          </div>
        </TooltipWithBounds>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
