import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

import type { CategorySeries } from '../../data/contract';
import { EFFECTS } from '../../data/effects';
import { MARGIN } from '../../data/spec';
import { thinTicks } from '../shared/ticks';

type Row = { text: string; color?: string };
type Tip = { left: number; top: number; rows: Row[] };

export function tooltipPlugin(content: (u: uPlot) => Tip | null): uPlot.Plugin {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'absolute',
    pointerEvents: 'none',
    background: 'white',
    border: '1px solid #ccc',
    padding: '4px 8px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    zIndex: '100',
    display: 'none',
  });
  return {
    hooks: {
      init: u => {
        u.over.appendChild(el);
      },
      setCursor: u => {
        const tip = u.cursor.left! < 0 ? null : content(u);
        if (!tip) {
          el.style.display = 'none';
          return;
        }
        el.replaceChildren(
          ...tip.rows.map(r => {
            const div = document.createElement('div');
            div.textContent = r.text;
            if (r.color) div.style.color = r.color;
            return div;
          }),
        );
        const flipX = tip.left > u.over.clientWidth / 2;
        const flipY = tip.top > u.over.clientHeight / 2;
        el.style.display = '';
        el.style.left = `${tip.left + (flipX ? -12 : 12)}px`;
        el.style.top = `${tip.top + (flipY ? -12 : 12)}px`;
        el.style.transform = `translate(${flipX ? -100 : 0}%, ${flipY ? -100 : 0}%)`;
      },
    },
  };
}

// rangeNum only rounds to a tenth of the magnitude; round out to a 1/2/5 step like d3's nice().
export const nice: uPlot.Range.Function = (_u, min, max) => {
  const span = max - min || 1;
  const mag = 10 ** Math.floor(Math.log10(span / 10));
  const step = mag * ([1, 2, 5].find(m => span / (mag * m) <= 10) ?? 10);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
};

export const base = {
  padding: [MARGIN.top, MARGIN.right, 0, 0],
  legend: { show: false },
} satisfies Partial<uPlot.Options>;

export function UPlot({
  options,
  data,
  onSettled,
}: {
  options: uPlot.Options;
  data: uPlot.AlignedData;
  onSettled: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const u = new uPlot(
      { ...options, hooks: { ...options.hooks, ready: [onSettled] } },
      data,
      ref.current!,
    );
    return () => u.destroy();
  }, [options, data, onSettled]);

  return <div ref={ref} />;
}


export const categoryAxis = (categories: string[]): uPlot.Axis => ({
  size: MARGIN.bottom,
  grid: { show: false },
  splits: () => thinTicks(categories.map((_, i) => i)),
  values: (_u, splits) => splits.map(i => categories[i] ?? ''),
});

export const valueAxis: uPlot.Axis = { size: MARGIN.left };

export const cursor = {
  x: false,
  y: false,
  drag: { x: false, y: false },
  points: { show: EFFECTS },
} satisfies uPlot.Cursor;

export function stacked(series: CategorySeries[]) {
  const layers: number[][] = [];
  series.forEach((s, j) => layers.push(s.values.map((v, i) => v + (layers[j - 1]?.[i] ?? 0))));
  return layers;
}

export const categoryTip = (categories: string[], series: CategorySeries[]) =>
  tooltipPlugin(u => {
    const i = u.cursor.idx;
    if (i == null) return null;
    return {
      left: u.cursor.left!,
      top: u.cursor.top!,
      rows: [
        { text: categories[i]! },
        ...series.map(s => ({ text: `${s.id}: ${s.values[i]}`, color: s.color })),
      ],
    };
  });

export const fromZero: uPlot.Range.Function = (u, _min, max, key) => nice(u, 0, max, key);
