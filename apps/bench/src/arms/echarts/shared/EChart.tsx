import { init } from 'echarts/core';
import type { EChartsCoreOption } from 'echarts/core';
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
