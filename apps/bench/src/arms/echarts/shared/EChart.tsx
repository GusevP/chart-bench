import { init } from 'echarts/core';
import type { EChartsCoreOption, EChartsType } from 'echarts/core';
import { useEffect, useRef } from 'react';

export function EChart({
  width,
  height,
  option,
  onSettled,
}: {
  width: number;
  height: number;
  option: EChartsCoreOption;
  onSettled: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<EChartsType>(null);

  useEffect(() => {
    const chart = init(ref.current, null, { renderer: 'canvas', width, height });
    chartRef.current = chart;
    return () => chart.dispose();
  }, [width, height]);

  useEffect(() => {
    const chart = chartRef.current!;
    chart.off('finished');
    // `rendered` fires every frame; `finished` only once all progressive chunks are drawn.
    chart.on('finished', () => {
      chart.off('finished');
      onSettled();
    });
    chart.setOption(option, true);
  }, [width, height, option, onSettled]);

  return <div ref={ref} style={{ width, height }} />;
}
