import { defineChart } from '@tanstack/charts';
import { Chart as TanChart } from '@tanstack/charts/react';
import { treemap } from '@tanstack/charts/hierarchy/treemap';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';

import type { GalleryChartProps, TreeNode } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { treemapRamp } from '../../shared/treemap';

type Row = { id: string; parentId: string | null; value?: number };

function rows(node: TreeNode, parentId: string | null, out: Row[] = []) {
  out.push({ id: node.id, parentId, value: node.value });
  for (const child of node.children ?? []) rows(child, node.id, out);
  return out;
}

function Chart({ width, height, data }: GalleryChartProps<'treemap'>) {
  const definition = useMemo(() => {
    const ramp = treemapRamp(data);
    return defineChart({
      marks: [
        treemap(rows(data, null), {
          nodeId: r => r.id,
          parentId: r => r.parentId,
          value: r => r.value,
          method: 'squarify',
          round: true,
          paddingInner: 0,
          paddingOuter: 0,
          inset: 0,
          fill: node => ramp(node.value),
        }),
      ],
      scales: { x: null, y: null },
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return (
    <div className="crisp">
      <style>{'.crisp rect{shape-rendering:crispEdges}'}</style>
      <TanChart definition={definition} width={width} height={height} ariaLabel="Treemap" />
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
