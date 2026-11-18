import type { PlotlyHTMLElement } from 'plotly.js-dist-min';
import { useMemo } from 'react';

import type { GalleryChartProps, TreeNode } from '../../../data/contract';
import { treemapRamp } from '../../shared/treemap';
import { Plot, baseLayout } from '../shared/Plot';
import type { Figure } from '../shared/Plot';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'treemap'>) {
  const figure = useMemo((): Figure => {
    const ramp = treemapRamp(data);
    const ids: string[] = [];
    const parents: string[] = [];
    const values: number[] = [];
    const colors: string[] = [];
    const walk = (node: TreeNode, parent: string) => {
      ids.push(node.id);
      parents.push(parent);
      values.push(node.value ?? 0);
      colors.push(node.children ? 'rgba(0,0,0,0)' : ramp(node.value!));
      node.children?.forEach(child => walk(child, node.id));
    };
    walk(data, '');
    return {
      data: [
        {
          type: 'treemap',
          ids,
          labels: ids,
          parents,
          values,
          branchvalues: 'remainder',
          sort: false,
          textinfo: 'none',
          pathbar: { visible: false },
          tiling: { pad: 0, squarifyratio: (1 + Math.sqrt(5)) / 2 },
          marker: { colors, line: { width: 0 }, pad: { t: 0, l: 0, r: 0, b: 0 } },
          hovertemplate: '%{label}: %{value}<extra></extra>',
        },
      ],
      layout: baseLayout(width, height),
    };
  }, [data, width, height]);
  return <Plot figure={figure} onSettled={onSettled} init={disableDrillDown} />;
}

const disableDrillDown = (el: PlotlyHTMLElement) => el.on('plotly_treemapclick', () => false);

export default { settleMode: 'signal' as const, Chart };
