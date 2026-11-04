import type { ChartType, Plugin, Scale } from 'chart.js';
import { useState } from 'react';

import { MARGIN } from '../../../data/spec';

// Fixing the axis boxes reproduces MARGIN exactly; Chart.js otherwise sizes them from tick labels.
export const fixWidth = (scale: Scale) => {
  scale.width = MARGIN.left;
};
export const fixHeight = (scale: Scale) => {
  scale.height = MARGIN.bottom;
};

export function useSettlePlugin<T extends ChartType>(onSettled: () => void): Plugin<T>[] {
  const [plugins] = useState(() => {
    let done = false;
    const plugin: Plugin<T> = {
      id: 'benchSettled',
      afterRender: () => {
        if (done) return;
        done = true;
        onSettled();
      },
    };
    return [plugin];
  });
  return plugins;
}
