import Highcharts from 'highcharts';
import 'highcharts/modules/treemap';
import { HighchartsReact } from 'highcharts-react-official';
import { useMemo } from 'react';

import type { GalleryChartProps, TreeNode } from '../../../data/contract';
import { treemapRamp } from '../../shared/treemap';
import { base } from '../shared/options';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'treemap'>) {
  const options = useMemo<Highcharts.Options>(() => {
    const ramp = treemapRamp(data);
    const points: Highcharts.PointOptionsObject[] = [];
    const walk = (node: TreeNode, parent?: string) => {
      if (node.children) {
        points.push({ id: node.id, name: node.id, parent, color: 'transparent' });
        for (const child of node.children) walk(child, node.id);
      } else points.push({ id: node.id, name: node.id, parent, value: node.value!, color: ramp(node.value!) });
    };
    if (data.children) for (const child of data.children) walk(child);
    else walk(data);
    return {
      ...base(width, height, onSettled),
      series: [
        {
          type: 'treemap',
          layoutAlgorithm: 'squarified',
          allowTraversingTree: false,
          borderWidth: 0,
          dataLabels: { enabled: false },
          levels: [{ level: 1, borderWidth: 0, dataLabels: { enabled: false } }],
          data: points,
        },
      ],
    };
  }, [width, height, data, onSettled]);
  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
