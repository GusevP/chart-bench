import { useMemo, useState } from 'react';
import type { MouseEvent } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { LINK_OPACITY, sankeyColors } from '../../shared/sankey';
import { Tooltip, pointer } from '../shared/Chart';
import { linkPath, sankeyLayout } from '../shared/sankey';

function Chart({ width, height, data }: GalleryChartProps<'sankey'>) {
  const [tip, setTip] = useState<{ left: number; top: number; text: string } | null>(null);
  const { nodes, links } = useMemo(
    () => sankeyLayout(data, MARGIN.left, MARGIN.top, width - MARGIN.right, height - MARGIN.bottom),
    [data, width, height],
  );
  const marks = useMemo(() => {
    const colors = sankeyColors(data);
    return (
      <>
        {links.map((l, i) => (
          <path
            key={i}
            data-i={i}
            d={linkPath(l)}
            fill="none"
            stroke={colors.get(l.source.id)}
            strokeOpacity={LINK_OPACITY}
            strokeWidth={Math.max(1, l.width)}
          />
        ))}
        {nodes.map((n, i) => (
          <rect
            key={n.id}
            data-i={i}
            x={n.x0}
            y={n.y0}
            width={n.x1 - n.x0}
            height={n.y1 - n.y0}
            fill={colors.get(n.id)}
          />
        ))}
      </>
    );
  }, [data, nodes, links]);

  const onMove = (e: MouseEvent<SVGSVGElement>) => {
    const { target } = e;
    const link = target instanceof SVGPathElement ? links[Number(target.dataset.i)] : undefined;
    const node = target instanceof SVGRectElement ? nodes[Number(target.dataset.i)] : undefined;
    const text = link
      ? `${link.source.id} → ${link.target.id}: ${link.value}`
      : node && `${node.id}: ${node.value}`;
    const [left, top] = pointer(e);
    setTip(text ? { left, top, text } : null);
  };

  return (
    <div style={{ position: 'relative', width, height }}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        {marks}
      </svg>
      {tip && (
        <Tooltip left={tip.left} top={tip.top} width={width} height={height}>
          {tip.text}
        </Tooltip>
      )}
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
