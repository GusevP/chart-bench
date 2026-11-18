import type { ApexOptions } from 'apexcharts';
import { useMemo, useState } from 'react';

import { EFFECTS } from '../../../data/effects';
import { MARGIN } from '../../../data/spec';
import { thinTicks } from '../../shared/ticks';

type Padding = NonNullable<NonNullable<ApexOptions['grid']>['padding']>;

// ApexCharts reserves ~30 px above and ~5 px below the plot on its own; these offsets land it on MARGIN.
export const AXIS_PADDING: Padding = {
  top: MARGIN.top - 31,
  right: MARGIN.right,
  bottom: MARGIN.bottom - 49,
  left: MARGIN.left - 30,
};

// Without an x-axis title ApexCharts gives the x labels ~11 px less room.
export const GALLERY_PADDING: Padding = { ...AXIS_PADDING, bottom: MARGIN.bottom - 37.7 };

export const Y_AXIS = { axisBorder: { show: true, offsetX: -3 }, axisTicks: { show: true, offsetX: -3 } };
export const Y_LABELS = { minWidth: 30, maxWidth: 30, offsetX: 16 };

export function useBaseOptions(onSettled: () => void, padding: Padding = AXIS_PADDING): ApexOptions {
  const [base] = useState<ApexOptions>(() => {
    let done = false;
    return {
      chart: {
        animations: { enabled: EFFECTS },
        toolbar: { show: false },
        zoom: { enabled: false },
        parentHeightOffset: 0,
        events: {
          mounted: () => {
            if (done) return;
            done = true;
            onSettled();
          },
          updated: () => onSettled(),
        },
      },
      states: EFFECTS ? {} : { hover: { filter: { type: 'none' } }, active: { filter: { type: 'none' } } },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: {
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
        padding,
      },
    };
  });
  return base;
}

export function useGalleryOptions(onSettled: () => void, padding: Padding = GALLERY_PADDING): ApexOptions {
  const base = useBaseOptions(onSettled, padding);
  return useMemo(() => ({ ...base, fill: { type: 'solid', opacity: 1 } }), [base]);
}

export const shownOnly = (labels: string[]) => {
  const shown = new Set(thinTicks(labels));
  return (label: string) => (shown.has(label) ? label : '');
};

// The tooltip title goes through the axis label formatter unless given its own, and a thinned label is ''.
export const categoryTooltipX = (categories: string[]) => ({
  formatter: (_: number, opts?: { dataPointIndex: number }) => categories[opts?.dataPointIndex ?? 0] ?? '',
});

export const categoryX = (categories: string[]): ApexOptions['xaxis'] => ({
  type: 'category',
  categories,
  labels: { rotate: 0, hideOverlappingLabels: false, formatter: shownOnly(categories) },
  tooltip: { enabled: false },
});
