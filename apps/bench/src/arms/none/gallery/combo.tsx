import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { CategoryAxis, Tooltip, YAxis, plotPointer } from '../shared/Chart';
import { band } from '../shared/band';
import { linear } from '../shared/linear';

function Chart({ width, height, data }: GalleryChartProps<'combo'>) {
  const [hover, setHover] = useState<{ i: number; left: number; top: number } | null>(null);
  const x = useMemo(
    () => band(data.categories.length, [MARGIN.left, width - COMBO_RIGHT], 0.2),
    [data, width],
  );
  const yRange: [number, number] = [height - MARGIN.bottom, MARGIN.top];
  const barY = useMemo(() => linear([0, Math.max(...data.bars.values) || 1], yRange).nice(), [data, height]);
  const lineY = useMemo(() => linear([0, Math.max(...data.line.values) || 1], yRange).nice(), [data, height]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const p = plotPointer(e, x.range, yRange);
    setHover(p && { i: x.index(p[0]), left: p[0], top: p[1] });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <YAxis y={barY} x={x.range[0]} grid={x.range[1] - x.range[0]} />
        <YAxis y={lineY} x={x.range[1]} right />
        <CategoryAxis categories={data.categories} at={x.center} x={x.range} y={yRange[0]} />
        <g fill={data.bars.color}>
          {data.bars.values.map((v, i) => (
            <rect key={i} x={x.start(i)} y={barY(v)} width={x.width} height={yRange[0] - barY(v)} />
          ))}
        </g>
        <polyline
          points={data.line.values.map((v, i) => `${x.center(i)},${lineY(v)}`).join(' ')}
          fill="none"
          stroke={data.line.color}
          strokeWidth={COMBO_LINE_WIDTH}
        />
      </svg>
      {hover && (
        <Tooltip left={hover.left} top={hover.top} width={width} height={height}>
          <div>{data.categories[hover.i]}</div>
          <div style={{ color: data.bars.color }}>
            {data.bars.id}: {data.bars.values[hover.i]}
          </div>
          <div style={{ color: data.line.color }}>
            {data.line.id}: {data.line.values[hover.i]}
          </div>
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
