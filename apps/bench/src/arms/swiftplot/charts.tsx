import { useMemo } from 'react';
import { area, dots, line, ticks } from 'swiftplot';
import type { TooltipOptions } from 'swiftplot';

import type { Arm, ScatterChartProps, SurvivalChartProps } from '../../data/contract';
import { MARGIN } from '../../data/spec';
import { Plot, column } from './shared';
import type { PlotOptions } from './shared';

const survivalTip: TooltipOptions = {
  mode: 'x',
  title: x => `Day ${Math.round(x)}`,
  value: y => y.toFixed(3),
};
const scatterTip: TooltipOptions = {
  mode: 'nearest',
  text: (label, x, y) => `${label}: (${x.toFixed(1)}, ${y.toFixed(1)})`,
};

function Survival({ width, height, series, onSettled }: SurvivalChartProps) {
  const options = useMemo<PlotOptions>(
    () => ({
      width,
      height,
      margin: MARGIN,
      x: { domain: [0, Math.max(1, ...series.map(s => s.points.at(-1)?.x ?? 0))], label: 'Days' },
      y: { domain: [0, 1], label: 'Survival' },
      marks: series.flatMap(s => {
        const x = column(s.points, p => p.x);
        const censored = s.points.filter(p => p.censored);
        return [
          area({
            x,
            y1: column(s.points, p => p.lower),
            y2: column(s.points, p => p.upper),
            curve: 'step',
            color: s.color,
            alpha: 0.15,
            group: s.id,
          }),
          line({ x, y: column(s.points, p => p.y), curve: 'step', color: s.color, width: 1.5, label: s.id }),
          ticks({
            x: column(censored, p => p.x),
            y: column(censored, p => p.y),
            color: s.color,
            size: 4,
            group: s.id,
          }),
        ];
      }),
    }),
    [series, width, height],
  );
  return <Plot options={options} tip={survivalTip} onSettled={onSettled} />;
}

function Scatter({ width, height, series, onSettled }: ScatterChartProps) {
  const options = useMemo<PlotOptions>(
    () => ({
      width,
      height,
      margin: MARGIN,
      x: { domain: 'nice', label: 'X' },
      y: { domain: 'nice', label: 'Y' },
      marks: series.map(s =>
        dots({
          x: column(s.points, p => p.x),
          y: column(s.points, p => p.y),
          r: column(s.points, p => p.size),
          color: s.color,
          alpha: 0.7,
          label: s.id,
        }),
      ),
    }),
    [series, width, height],
  );
  return <Plot options={options} tip={scatterTip} onSettled={onSettled} />;
}

export const arm: Arm = { settleMode: 'signal', Survival, Scatter };
