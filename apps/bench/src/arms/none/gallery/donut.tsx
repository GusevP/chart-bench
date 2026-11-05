import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { INNER_RATIO, donutRadius } from '../../shared/donut';
import { Tooltip, pointer } from '../shared/Chart';
import { TAU, arcPath, plotCentre, polar } from '../shared/polar';

type Slice = GalleryChartProps<'donut'>['data']['slices'][number];

function Chart({ width, height, data }: GalleryChartProps<'donut'>) {
  const [tip, setTip] = useState<{ left: number; top: number; slice: Slice } | null>(null);
  const outer = donutRadius(width, height);
  const inner = outer * INNER_RATIO;
  const [cx, cy] = plotCentre(width, height);
  const arcs = useMemo(() => {
    const total = data.slices.reduce((sum, s) => sum + s.value, 0);
    let sum = 0;
    return data.slices.map(slice => {
      const start = (sum / total) * TAU;
      sum += slice.value;
      return { slice, start, end: (sum / total) * TAU };
    });
  }, [data]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const [left, top] = pointer(e);
    const { angle, r } = polar(left - cx, top - cy);
    const arc = r >= inner && r <= outer ? arcs.find(a => angle < a.end) : undefined;
    setTip(arc ? { left, top, slice: arc.slice } : null);
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        <g transform={`translate(${cx},${cy})`}>
          {arcs.map(({ slice, start, end }) => (
            <path key={slice.id} d={arcPath(inner, outer, start, end)} fill={slice.color} />
          ))}
        </g>
      </svg>
      {tip && (
        <Tooltip left={tip.left} top={tip.top} width={width} height={height}>
          <div style={{ color: tip.slice.color }}>
            {tip.slice.id}: {tip.slice.value}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
