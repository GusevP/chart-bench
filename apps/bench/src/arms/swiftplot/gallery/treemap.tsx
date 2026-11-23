import { useMemo } from 'react';
import { treemap } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import type { TreeNode } from '../../../data/contract';
import { PALETTE } from '../../../data/generate';
import { Plot } from '../shared';
import type { PlotOptions } from '../shared';

function columns(root: TreeNode) {
  const nodes: string[] = [];
  const parent: number[] = [];
  const value: number[] = [];
  const walk = (node: TreeNode, up: number) => {
    const at = nodes.push(node.id) - 1;
    parent.push(up);
    value.push(node.value ?? 0);
    node.children?.forEach(child => walk(child, at));
  };
  walk(root, -1);
  return { nodes, parent, value };
}

function Chart({ width, height, data, onSettled }: GalleryChartProps<'treemap'>) {
  const tree = useMemo(() => columns(data), [data]);
  const options = useMemo<PlotOptions>(
    () => ({ width, height, margin: MARGIN, frame: 'blank', marks: [treemap({ ...tree, colors: PALETTE })] }),
    [tree, width, height],
  );
  const tip = useMemo<TooltipOptions>(
    () => ({
      mode: 'nearest',
      // A parent drawn as one rectangle has no value of its own.
      text: (_label, _x, _y, row = 0) =>
        tree.value[row] ? `${tree.nodes[row]}: ${tree.value[row]}` : tree.nodes[row]!,
    }),
    [tree],
  );
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
