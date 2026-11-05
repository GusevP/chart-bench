import { cell, defineChart } from '@tanstack/charts';
import { Chart as TanChart } from '@tanstack/charts/react';
import { scaleBand } from '@tanstack/charts/scales/band';
import { tooltip } from '@tanstack/charts/tooltip';
import { scaleLinear } from 'd3-scale';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { HEAT_RANGE, heatmapDomain } from '../../shared/colorRamp';
import { thinTicks } from '../../shared/ticks';

function Chart({ width, height, data }: GalleryChartProps<'heatmap'>) {
  const definition = useMemo(() => {
    const rows = data.ys.flatMap((y, j) => data.xs.map((x, i) => ({ x, y, value: data.values[j]![i]!, key: `${j}:${i}` })));
    return defineChart({
      marks: [
        cell(rows, {
          x: 'x',
          y: 'y',
          color: 'value',
          inset: 0,
          key: 'key',
        }),
      ],
      scales: {
        x: {
          scale: () => scaleBand<string>().domain(data.xs),
          axis: { ticks: { values: thinTicks(data.xs) } },
        },
        y: {
          scale: () => scaleBand<string>().domain(data.ys),
          axis: { ticks: { values: thinTicks(data.ys) } },
        },
      },
      color: { domain: heatmapDomain(data.values), scale: () => scaleLinear<string>().range(HEAT_RANGE) },
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return (
    <div className="crisp">
      <style>{'.crisp rect{shape-rendering:crispEdges}'}</style>
      <TanChart definition={definition} width={width} height={height} ariaLabel="Heatmap" />
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
