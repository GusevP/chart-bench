import { Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import { Flow, SankeyController } from 'chartjs-chart-sankey';
import type { SankeyDataPoint } from 'chartjs-chart-sankey';
import { useMemo } from 'react';
import { Chart as ReactChart } from 'react-chartjs-2';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { LINK_OPACITY, NODE_GAP, NODE_WIDTH, sankeyColors } from '../../shared/sankey';
import { useSettlePlugin } from '../shared/chart';

ChartJS.register(LinearScale, SankeyController, Flow, Tooltip);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'sankey'>) {
  const plugins = useSettlePlugin<'sankey'>(onSettled);
  const chartData = useMemo(() => {
    const colors = sankeyColors(data);
    const colorOf = (key: string) => colors.get(key) ?? 'black';
    return {
      datasets: [
        {
          data: data.links.map(l => ({ from: l.source, to: l.target, flow: l.value })),
          colorMode: 'from',
          colorFrom: (ctx: { raw: SankeyDataPoint }) => colorOf(ctx.raw.from),
          colorTo: (ctx: { raw: SankeyDataPoint }) => colorOf(ctx.raw.to),
          alpha: LINK_OPACITY,
          nodeWidth: NODE_WIDTH,
          nodePadding: NODE_GAP,
          borderWidth: 0,
          nodeLabels: { display: false },
        },
      ],
    } as unknown as ChartData<'sankey'>;
  }, [data]);
  const options = useMemo<ChartOptions<'sankey'>>(
    () => ({
      responsive: false,
      animation: false,
      layout: { padding: { ...MARGIN, right: MARGIN.right + NODE_WIDTH } },
      plugins: { legend: { display: false } },
    }),
    [],
  );
  return (
    <ReactChart type="sankey" width={width} height={height} data={chartData} options={options} plugins={plugins} />
  );
}

export default { settleMode: 'signal' as const, Chart };
