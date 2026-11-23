import { useMemo } from 'react';
import { band, box, dots } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import {
  BOX_OUTLIER_COLOR,
  BOX_OUTLIER_RADIUS,
  BOX_RATIO,
  boxScale,
  boxplotStats,
} from '../../shared/boxplot';
import { Plot } from '../shared';
import type { PlotOptions } from '../shared';

const OUTLIERS = 'Outliers';

function Chart({ width, height, data, onSettled }: GalleryChartProps<'boxplot'>) {
  const stats = useMemo(() => boxplotStats(data), [data]);
  const options = useMemo<PlotOptions>(() => {
    const { domain, step } = boxScale(stats);
    const outliers = stats.flatMap((s, i) => s.outliers.map(y => [i, y] as const));
    return {
      width,
      height,
      margin: MARGIN,
      x: band({ label: '', categories: stats.map(s => s.id) }),
      y: { domain, label: '', step },
      marks: [
        ...stats.map((s, i) =>
          box({
            x: [i],
            min: [s.whiskerLow],
            q1: [s.q1],
            median: [s.median],
            q3: [s.q3],
            max: [s.whiskerHigh],
            width: BOX_RATIO,
            color: s.color,
            label: s.id,
          }),
        ),
        dots({
          x: outliers.map(o => o[0]),
          y: outliers.map(o => o[1]),
          r: outliers.map(() => BOX_OUTLIER_RADIUS),
          color: BOX_OUTLIER_COLOR,
          label: OUTLIERS,
        }),
      ],
    };
  }, [stats, width, height]);
  const tip = useMemo<TooltipOptions>(
    () => ({
      mode: 'nearest',
      text: (label, x, y) => {
        const s = stats[Math.round(x)]!;
        return label === OUTLIERS
          ? `${s.id} outlier: ${y}`
          : `${s.id}: whiskers ${s.whiskerLow} to ${s.whiskerHigh}, Q1 ${s.q1}, median ${s.median}, Q3 ${s.q3}`;
      },
    }),
    [stats],
  );
  return <Plot options={options} tip={tip} onSettled={onSettled} />;
}

export default { settleMode: 'signal' as const, Chart };
