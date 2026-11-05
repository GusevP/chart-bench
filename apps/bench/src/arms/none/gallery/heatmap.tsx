import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { heatmapRamp } from '../../shared/colorRamp';
import { CategoryAxis, CategoryYAxis, Tooltip, plotPointer } from '../shared/Chart';
import { band } from '../shared/band';

function Chart({ width, height, data }: GalleryChartProps<'heatmap'>) {
  const [hover, setHover] = useState<{ i: number; j: number; left: number; top: number } | null>(null);
  const x = useMemo(() => band(data.xs.length, [MARGIN.left, width - MARGIN.right], 0), [data, width]);
  const y = useMemo(() => band(data.ys.length, [MARGIN.top, height - MARGIN.bottom], 0), [data, height]);
  const cells = useMemo(() => {
    const ramp = heatmapRamp(data.values);
    return data.values.map((row, j) =>
      row.map((v, i) => (
        <rect
          key={`${j}-${i}`}
          x={x.start(i)}
          y={y.start(j)}
          width={x.width}
          height={y.width}
          fill={ramp(v)}
        />
      )),
    );
  }, [data, x, y]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const p = plotPointer(e, x.range, [y.range[1], y.range[0]]);
    setHover(p && { i: x.index(p[0]), j: y.index(p[1]), left: p[0], top: p[1] });
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <g shapeRendering="crispEdges">{cells}</g>
        <CategoryAxis categories={data.xs} at={x.center} x={x.range} y={y.range[1]} />
        <CategoryYAxis categories={data.ys} at={y.center} x={x.range[0]} y={y.range} />
      </svg>
      {hover && (
        <Tooltip left={hover.left} top={hover.top} width={width} height={height}>
          <div>
            {data.ys[hover.j]} / {data.xs[hover.i]}
          </div>
          <div>{data.values[hover.j]?.[hover.i]}</div>
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
