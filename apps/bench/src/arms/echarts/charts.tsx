import { LineChart, ScatterChart } from 'echarts/charts';
import type { LineSeriesOption, ScatterSeriesOption } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import type { GridComponentOption, TooltipComponentOption } from 'echarts/components';
import { init, use } from 'echarts/core';
import type { ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef } from 'react';

import type { Arm, ScatterChartProps, SurvivalChartProps, SurvivalPoint } from '../../data/contract';
import { MARGIN } from '../../data/spec';

use([LineChart, ScatterChart, GridComponent, TooltipComponent, CanvasRenderer]);

type Option = ComposeOption<
  LineSeriesOption | ScatterSeriesOption | GridComponentOption | TooltipComponentOption
>;

const axisCommon = {
  type: 'value',
  nameLocation: 'middle',
  axisLine: { show: true },
  axisTick: { show: true },
} as const;

function EChart({
  width,
  height,
  option,
  onSettled,
}: {
  width: number;
  height: number;
  option: Option;
  onSettled: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chart = init(ref.current, null, { renderer: 'canvas', width, height });
    // `rendered` fires every frame; `finished` only once all progressive chunks are drawn.
    chart.on('finished', () => {
      chart.off('finished');
      onSettled();
    });
    chart.setOption(option);
    return () => chart.dispose();
  }, [width, height, option, onSettled]);

  return <div ref={ref} style={{ width, height }} />;
}

function valueAt(points: SurvivalPoint[], x: number) {
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid]!.x <= x) lo = mid + 1;
    else hi = mid;
  }
  return points[Math.max(0, lo - 1)];
}

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const option = useMemo((): Option => {
    const lastX = Math.max(...series.map(s => s.points.at(-1)?.x ?? 0));
    return {
      animation: false,
      grid: { ...MARGIN, outerBoundsMode: 'none' },
      xAxis: {
        ...axisCommon,
        min: 0,
        max: lastX,
        name: 'Days',
        nameGap: 28,
        splitLine: { show: false },
        axisLabel: { hideOverlap: true },
      },
      yAxis: { ...axisCommon, min: 0, max: 1, name: 'Survival', nameGap: 38 },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line', snap: false },
        formatter: params => {
          const first = Array.isArray(params) ? params[0] : params;
          const x = first && 'axisValue' in first ? Number(first.axisValue) : 0;
          return [
            `Day ${Math.round(x)}`,
            ...series.map(
              s => `<span style="color:${s.color}">${s.id}: ${valueAt(s.points, x)?.y.toFixed(3)}</span>`,
            ),
          ].join('<br/>');
        },
      },
      // Band = stacked (lower, upper - lower) with only the top one filled: ECharts' confidence-band example.
      series: series.flatMap((s): Array<LineSeriesOption | ScatterSeriesOption> => [
        {
          type: 'line',
          step: 'end',
          stack: `band-${s.id}`,
          data: s.points.map(p => [p.x, p.lower]),
          lineStyle: { opacity: 0 },
          symbol: 'none',
          silent: true,
        },
        {
          type: 'line',
          step: 'end',
          stack: `band-${s.id}`,
          data: s.points.map(p => [p.x, p.upper - p.lower]),
          lineStyle: { opacity: 0 },
          areaStyle: { color: s.color, opacity: 0.15 },
          symbol: 'none',
          silent: true,
        },
        {
          type: 'line',
          name: s.id,
          step: 'end',
          data: s.points.map(p => [p.x, p.y]),
          color: s.color,
          lineStyle: { width: 1.5 },
          showSymbol: false,
        },
        {
          type: 'scatter',
          data: s.points.filter(p => p.censored).map(p => [p.x, p.y]),
          symbol: 'rect',
          symbolSize: [1, 8],
          color: s.color,
          silent: true,
        },
      ]),
    };
  }, [series]);

  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const option = useMemo(
    (): Option => ({
      animation: false,
      grid: { ...MARGIN, outerBoundsMode: 'none' },
      xAxis: { ...axisCommon, scale: true, name: 'X', nameGap: 28, splitLine: { show: false } },
      yAxis: { ...axisCommon, scale: true, name: 'Y', nameGap: 38 },
      tooltip: {
        trigger: 'item',
        formatter: params => {
          const item = Array.isArray(params) ? params[0] : params;
          const [x, y] = Array.isArray(item?.value) ? item.value.map(Number) : [];
          return `${item?.seriesName}: (${x?.toFixed(1)}, ${y?.toFixed(1)})`;
        },
      },
      series: series.map((s): ScatterSeriesOption => ({
        type: 'scatter',
        name: s.id,
        data: s.points.map(p => [p.x, p.y, p.size]),
        // symbolSize is a diameter; point.size is a radius.
        symbolSize: (value: number[]) => value[2]! * 2,
        color: s.color,
        itemStyle: { opacity: 0.7 },
        // Large mode (auto above 2000 points) draws one uniform symbol size, and progressive
        // rendering spreads the draw over frames; both would change what is measured.
        large: false,
        progressive: 0,
      })),
    }),
    [series],
  );

  return <EChart width={width} height={height} option={option} onSettled={onSettled} />;
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
