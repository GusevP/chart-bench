import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { CategoryAxis, Tooltip, YAxis, plotPointer } from '../shared/Chart';
import { linear } from '../shared/linear';
import { stack } from '../shared/stack';

function Chart({ width, height, data }: GalleryChartProps<'stacked-area'>) {
  const [hover, setHover] = useState<{ i: number; left: number; top: number } | null>(null);
  const { layers, max } = useMemo(() => stack(data), [data]);
  const x = useMemo(
    () => linear([0, data.categories.length - 1], [MARGIN.left, width - MARGIN.right]),
    [data, width],
  );
  const y = useMemo(() => linear([0, max || 1], [height - MARGIN.bottom, MARGIN.top]).nice(), [max, height]);
  const points = (values: number[]) => values.map((v, i) => `${x(i)},${y(v)}`);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const p = plotPointer(e, x.range, y.range);
    setHover(p && { i: Math.round(x.invert(p[0])), left: p[0], top: p[1] });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <YAxis y={y} x={x.range[0]} grid={x.range[1] - x.range[0]} />
        {data.series.map((s, j) => {
          const top = layers[j]!;
          const below = layers[j - 1] ?? top.map(() => 0);
          return (
            <polygon
              key={s.id}
              points={[...points(top), ...points(below).reverse()].join(' ')}
              fill={s.color}
              stroke={s.color}
            />
          );
        })}
        <CategoryAxis categories={data.categories} at={x} x={x.range} y={y.range[0]} />
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
