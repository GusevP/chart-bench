import { useMemo } from 'react';
import { Tooltip, Treemap } from 'recharts';

import type { GalleryChartProps, TreeNode } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { treemapRamp } from '../../shared/treemap';

type Row = { name: string; value?: number; children?: Row[] };

const toRow = (node: TreeNode): Row => ({
  name: node.id,
  value: node.value,
  children: node.children?.map(toRow),
});

function Chart({ width, height, data }: GalleryChartProps<'treemap'>) {
  const root = useMemo(() => toRow(data), [data]);
  const ramp = useMemo(() => treemapRamp(data), [data]);
  const content = useMemo(
    () =>
      function Cell(props: { x: number; y: number; width: number; height: number; value: number; children?: unknown }) {
        return props.children ? (
          <g />
        ) : (
          <rect
            x={props.x}
            y={props.y}
            width={props.width}
            height={props.height}
            fill={ramp(props.value)}
            shapeRendering="crispEdges"
          />
        );
      },
    [ramp],
  );
  return (
    <div style={{ width, height, boxSizing: 'border-box', padding: `${MARGIN.top}px ${MARGIN.right}px ${MARGIN.bottom}px ${MARGIN.left}px` }}>
      <Treemap
        width={width - MARGIN.left - MARGIN.right}
        height={height - MARGIN.top - MARGIN.bottom}
        data={[root]}
        dataKey="value"
        type="flat"
        content={content}
        isAnimationActive={EFFECTS}
      >
        <Tooltip isAnimationActive={EFFECTS} />
      </Treemap>
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
