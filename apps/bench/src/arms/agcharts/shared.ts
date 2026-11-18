import type { AgCartesianChartOptions, AgChartInstance } from 'ag-charts-community';
import { useEffect, useRef } from 'react';

import { EFFECTS } from '../../data/effects';
import { MARGIN } from '../../data/spec';

export function useSettle(onSettled: () => void, options: unknown) {
  const ref = useRef<AgChartInstance>(null);
  useEffect(() => {
    ref.current?.waitForUpdate().then(onSettled);
  }, [onSettled, options]);
  return ref;
}

export const base = (width: number, height: number) =>
  ({
    width,
    height,
    padding: { top: MARGIN.top, right: MARGIN.right, bottom: 0, left: 0 },
    seriesArea: { padding: { top: 0, right: 0, bottom: 0, left: 0 } },
    highlight: { enabled: EFFECTS },
  }) satisfies AgCartesianChartOptions;
