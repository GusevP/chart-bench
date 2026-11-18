import { AreaSeriesModule, CategoryAxisModule, ModuleRegistry, NumberAxisModule } from 'ag-charts-community';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { base, useSettle } from '../shared';

ModuleRegistry.registerModules([AreaSeriesModule, CategoryAxisModule, NumberAxisModule]);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'stacked-area'>) {
  const options = useMemo<AgCartesianChartOptions>(
    () => ({
      ...base(width, height),
      data: data.categories.map((category, i) => {
        const row: Record<string, string | number> = { category };
        data.series.forEach((s, j) => (row[`v${j}`] = s.values[i]!));
        return row;
      }),
      series: data.series.map((s, j) => ({
        type: 'area',
        xKey: 'category',
        yKey: `v${j}`,
        yName: s.id,
        stacked: true,
        fill: s.color,
        fillOpacity: 1,
        stroke: s.color,
        strokeWidth: 1,
        marker: { enabled: false },
      })),
      tooltip: { mode: 'shared' },
      axes: {
        x: {
          type: 'category',
          label: { autoRotate: false },
          position: 'bottom',
          paddingInner: 0,
          paddingOuter: 0,
          thickness: MARGIN.bottom,
        },
        y: { type: 'number', position: 'left', thickness: MARGIN.left },
      },
    }),
    [data, width, height],
  );
  const ref = useSettle(onSettled, options);
  return <AgCharts ref={ref} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
