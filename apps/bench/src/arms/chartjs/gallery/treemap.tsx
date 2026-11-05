import { Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import type { TreemapDataPoint } from 'chartjs-chart-treemap';
import { useMemo } from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';

import type { GalleryChartProps, TreeNode } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { treemapRamp } from '../../shared/treemap';
import { useSettlePlugin } from '../shared/chart';

ChartJS.register(LinearScale, TreemapController, TreemapElement, Tooltip);

type Record = { [group: string]: string | number };

// Group names become object keys, which JS reorders when they look like integers; indexes keep input order.
function flatten(root: TreeNode) {
  const records: Record[] = [];
  const names = new Map<string, string>();
  let depth = 0;
  const walk = (node: TreeNode, ancestors: string[]) => {
    const key = `n${names.size}`;
    names.set(key, node.id);
    if (node.children) {
      for (const child of node.children) walk(child, node === root ? ancestors : [...ancestors, key]);
      return;
    }
    depth = Math.max(depth, ancestors.length);
    const record: Record = { _leaf: key, value: node.value! };
    ancestors.forEach((a, i) => (record[String(i)] = a));
    records.push(record);
  };
  walk(root, []);
  return { records, names, groups: Array.from({ length: depth + 1 }, (_, i) => String(i)) };
}

function Chart({ width, height, data, onSettled }: GalleryChartProps<'treemap'>) {
  const plugins = useSettlePlugin<'treemap'>(onSettled);
  const chartData = useMemo(() => {
    const ramp = treemapRamp(data);
    const { records, names, groups } = flatten(data);
    return {
      names,
      data: {
        datasets: [
          {
            tree: records,
            key: 'value',
            groups,
            unsorted: true,
            spacing: 0,
            borderWidth: 0,
            labels: { display: false },
            captions: { display: false },
            backgroundColor: (ctx: ScriptableContext<'treemap'>) => {
              const raw = ctx.raw as TreemapDataPoint | undefined;
              return !raw || raw.isLeaf === false ? 'transparent' : ramp(raw.v);
            },
          },
        ],
      } as unknown as ChartData<'treemap'>,
    };
  }, [data]);
  const options = useMemo<ChartOptions<'treemap'>>(
    () => ({
      responsive: false,
      animation: EFFECTS ? undefined : false,
      layout: { padding: MARGIN },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: ctx => (ctx.raw as TreemapDataPoint).isLeaf !== false,
          callbacks: {
            title: () => '',
            label: ctx => {
              const raw = ctx.raw as TreemapDataPoint;
              return `${chartData.names.get(raw.g ?? '') ?? ''}: ${raw.v}`;
            },
          },
        },
      },
    }),
    [chartData],
  );
  return (
    <ReactChart type="treemap" width={width} height={height} data={chartData.data} options={options} plugins={plugins} />
  );
}

export default { settleMode: 'signal' as const, Chart };
