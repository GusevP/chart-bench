import { DonutSeriesModule, ModuleRegistry } from 'ag-charts-community';
import type { AgChartOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-react';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO } from '../../shared/donut';
import { useSettle } from '../shared';

ModuleRegistry.registerModules([DonutSeriesModule]);

function Chart({ width, height, data, onSettled }: GalleryChartProps<'donut'>) {
  const options = useMemo<AgChartOptions>(
    () => ({
      width,
      height,
      padding: MARGIN,
      seriesArea: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
      highlight: { enabled: EFFECTS },
      data: data.slices,
      series: [
        {
          type: 'donut',
          angleKey: 'value',
          legendItemKey: 'id',
          fills: data.slices.map(s => s.color),
          strokeWidth: 0,
          sectorSpacing: 0,
          innerRadiusRatio: INNER_RATIO,
          calloutLabel: { enabled: false },
          tooltip: { renderer: ({ datum }) => ({ data: [{ label: datum.id, value: String(datum.value) }] }) },
        },
      ],
    }),
    [data, width, height],
  );
  const ref = useSettle(onSettled, options);
  return <AgCharts ref={ref} options={options} />;
}

export default { settleMode: 'signal' as const, Chart };
