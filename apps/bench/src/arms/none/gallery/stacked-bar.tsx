import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { CategoryAxis, Tooltip, YAxis, plotPointer } from '../shared/Chart';
import { band } from '../shared/band';
import { linear } from '../shared/linear';
import { stack } from '../shared/stack';

type Tip = { left: number; top: number; category: string; id: string; color: string; value: number };

function Chart({ width, height, data }: GalleryChartProps<'stacked-bar'>) {
  const [tip, setTip] = useState<Tip | null>(null);
  const { layers, max } = useMemo(() => stack(data), [data]);
  const x = useMemo(
    () => band(data.categories.length, [MARGIN.left, width - MARGIN.right], 0.2),
    [data, width],
  );
  const y = useMemo(() => linear([0, max || 1], [height - MARGIN.bottom, MARGIN.top]).nice(), [max, height]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const p = plotPointer(e, x.range, y.range);
    if (!p) return setTip(null);
    const [px, py] = p;
    const i = x.index(px);
    const value = y.invert(py);
    const inBar = px >= x.start(i) && px <= x.start(i) + x.width;
    const s = inBar ? data.series[layers.findIndex(l => value < l[i]!)] : undefined;
    setTip(
      s
        ? { left: px, top: py, category: data.categories[i]!, id: s.id, color: s.color, value: s.values[i]! }
        : null,
    );
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        <YAxis y={y} x={x.range[0]} grid={x.range[1] - x.range[0]} />
        {data.series.map((s, j) => (
          <g key={s.id} fill={s.color}>
            {layers[j]!.map((top, i) => (
              <rect
                key={i}
                x={x.start(i)}
                y={y(top)}
                width={x.width}
                height={y(j ? layers[j - 1]![i]! : 0) - y(top)}
              />
            ))}
          </g>
        ))}
        <CategoryAxis categories={data.categories} at={x.center} x={x.range} y={y.range[0]} />
      </svg>
      {tip && (
        <Tooltip left={tip.left} top={tip.top} width={width} height={height}>
          <div>{tip.category}</div>
          <div style={{ color: tip.color }}>
            {tip.id}: {tip.value}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
