import {
  BarSeriesModule,
  CategoryAxisModule,
  LineSeriesModule,
  ModuleRegistry,
  NumberAxisModule,
} from 'ag-charts-community';
import type { AgCartesianChartOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { COMBO_LINE_WIDTH, COMBO_RIGHT } from '../../shared/combo';
import { base, useSettle } from '../shared';

ModuleRegistry.registerModules([BarSeriesModule, LineSeriesModule, CategoryAxisModule, NumberAxisModule]);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'combo'>) {
  const options = useMemo<AgCartesianChartOptions>(() => {
    const chart = base(width, height);
    return {
      ...chart,
      padding: { ...chart.padding, right: 0 },
      data: data.categories.map((category, i) => ({
        category,
        bar: data.bars.values[i]!,
        line: data.line.values[i]!,
      })),
      series: [
        { type: 'bar', xKey: 'category', yKey: 'bar', yName: data.bars.id, fill: data.bars.color, strokeWidth: 0 },
        {
          type: 'line',
          xKey: 'category',
          yKey: 'line',
          yName: data.line.id,
          yKeyAxis: 'right',
          stroke: data.line.color,
          strokeWidth: COMBO_LINE_WIDTH,
          marker: { enabled: false },
        },
      ],
      tooltip: { mode: 'shared' },
      axes: {
        x: {
          type: 'category',
          label: { autoRotate: false },
          position: 'bottom',
          paddingInner: 0.2,
          paddingOuter: 0.2,
          thickness: MARGIN.bottom,
        },
        y: {
          type: 'number',
          position: 'left',
          min: 0,
          thickness: MARGIN.left,
        },
        right: {
          type: 'number',
          position: 'right',
          min: 0,
          thickness: COMBO_RIGHT,
          gridLine: { enabled: false },
        },
      },
    };
  }, [data, width, height]);
  const ref = useSettle(onSettled, options);
  return <AgCharts ref={ref} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
