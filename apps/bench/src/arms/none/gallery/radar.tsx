import { useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import {
  RADAR_FILL_OPACITY,
  RADAR_GRID_COLOR,
  RADAR_STROKE_WIDTH,
  radarMax,
  radarRadius,
  radarRings,
} from '../../shared/radar';
import { Tooltip, pointer } from '../shared/Chart';
import { TAU, plotCentre, polar, polygonPoints } from '../shared/polar';

function Chart({ width, height, data }: GalleryChartProps<'radar'>) {
  const [hover, setHover] = useState<{ i: number; left: number; top: number } | null>(null);
  const radius = radarRadius(width, height);
  const count = data.categories.length;
  const max = radarMax(data);
  const [cx, cy] = plotCentre(width, height);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const [left, top] = pointer(e);
    const { angle, r } = polar(left - cx, top - cy);
    setHover(r <= radius ? { i: Math.round((angle / TAU) * count) % count, left, top } : null);
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <g transform={`translate(${cx},${cy})`}>
          <g fill="none" stroke={RADAR_GRID_COLOR} strokeWidth={1}>
            {radarRings(max).map(ring => (
              <polygon
                key={ring}
                points={polygonPoints(data.categories.map(() => (ring / max) * radius)).join(' ')}
              />
            ))}
            {polygonPoints(data.categories.map(() => radius)).map(([x, y], i) => (
              <line key={i} x2={x} y2={y} />
            ))}
          </g>
          {data.series.map(s => (
            <polygon
              key={s.id}
              points={polygonPoints(s.values.map(v => (v / max) * radius)).join(' ')}
              fill={s.color}
              fillOpacity={RADAR_FILL_OPACITY}
              stroke={s.color}
              strokeWidth={RADAR_STROKE_WIDTH}
            />
          ))}
        </g>
      </svg>
      {hover && (
        <Tooltip left={hover.left} top={hover.top} width={width} height={height}>
          <div>{data.categories[hover.i]}</div>
          {data.series.map(s => (
            <div key={s.id} style={{ color: s.color }}>
              {s.id}: {s.values[hover.i]}
            </div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
