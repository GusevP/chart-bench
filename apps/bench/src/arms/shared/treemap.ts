import type { TreeNode } from '../../data/contract';
import { heatmapRamp } from './colorRamp';

export type Leaf = { id: string; value: number };

export const treeLeaves = (node: TreeNode, leaves: Leaf[] = []): Leaf[] => {
  if (node.children) for (const child of node.children) treeLeaves(child, leaves);
  else leaves.push({ id: node.id, value: node.value! });
  return leaves;
};

export const treemapRamp = (root: TreeNode) => heatmapRamp([treeLeaves(root).map(l => l.value)]);
