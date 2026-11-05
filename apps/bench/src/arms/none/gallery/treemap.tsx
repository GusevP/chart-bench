import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { treemapRamp } from '../../shared/treemap';
import { Tooltip, pointer } from '../shared/Chart';
import { boxLeaves, squarify } from '../shared/treemap';
import type { Box } from '../shared/treemap';

function Chart({ width, height, data }: GalleryChartProps<'treemap'>) {
  const [tip, setTip] = useState<{ left: number; top: number; leaf: Box } | null>(null);
  const leaves = useMemo(
    () => boxLeaves(squarify(data, MARGIN.left, MARGIN.top, width - MARGIN.right, height - MARGIN.bottom)),
    [data, width, height],
  );
  const marks = useMemo(() => {
    const ramp = treemapRamp(data);
    return (
      <g shapeRendering="crispEdges">
        {leaves.map((leaf, i) => {
          const x = Math.round(leaf.x0);
          const y = Math.round(leaf.y0);
          return (
            <rect
              key={leaf.id}
              data-i={i}
              x={x}
              y={y}
              width={Math.round(leaf.x1) - x}
              height={Math.round(leaf.y1) - y}
              fill={ramp(leaf.value)}
            />
          );
        })}
      </g>
    );
  }, [data, leaves]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const leaf = e.target instanceof SVGRectElement ? leaves[Number(e.target.dataset.i)] : undefined;
    const [left, top] = pointer(e);
    setTip(leaf ? { left, top, leaf } : null);
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        {marks}
      </svg>
      {tip && (
        <Tooltip left={tip.left} top={tip.top} width={width} height={height}>
          <div>{tip.leaf.id}</div>
          <div>{tip.leaf.value}</div>
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
