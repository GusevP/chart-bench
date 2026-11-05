import { BoxPlot } from '@nivo/boxplot';
import type { BoxPlotDatum, BoxPlotTooltipProps } from '@nivo/boxplot';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { BOX_RATIO, BOX_STROKE, BOX_STROKE_WIDTH, boxplotStats, boxScale } from '../../shared/boxplot';
import { thinTicks } from '../../shared/ticks';

const tooltipStyle = {
  background: '#fff',
  padding: '6px 9px',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
  fontSize: 12,
};

const Tooltip = ({ label, formatted }: BoxPlotTooltipProps) => (
  <div style={tooltipStyle}>
    <div>{label}</div>
    {['Whisker low', 'Q1', 'Median', 'Q3', 'Whisker high'].map((name, i) => (
      <div key={name}>
        {name}: {formatted.values[i]}
      </div>
    ))}
  </div>
);

function Chart({ width, height, data }: GalleryChartProps<'boxplot'>) {
  const stats = useMemo(() => boxplotStats(data), [data]);
  const rows = useMemo(
    () =>
      stats.map(s => ({
        group: s.id,
        subGroup: '',
        n: s.n,
        mean: s.mean,
        extrema: [s.min, s.max],
        quantiles: [0, 0.25, 0.5, 0.75, 1],
        values: [s.whiskerLow, s.q1, s.median, s.q3, s.whiskerHigh],
      })) as unknown as BoxPlotDatum[],
    [stats],
  );
  const colorById = useMemo(() => new Map(stats.map(s => [s.id, s.color])), [stats]);
  const { domain, ticks } = useMemo(() => boxScale(stats), [stats]);
  const padding = ((1 - BOX_RATIO) * stats.length) / (stats.length + BOX_RATIO);
  return (
    <BoxPlot
      width={width}
      height={height}
      margin={MARGIN}
      data={rows}
      groupBy="group"
      colorBy="group"
      colors={(d: { group: string }) => colorById.get(d.group) ?? 'black'}
      minValue={domain[0]}
      maxValue={domain[1]}
      valueScale={{ type: 'linear', nice: false }}
      padding={padding}
      indexScale={{ type: 'band', round: false }}
      borderWidth={BOX_STROKE_WIDTH}
      borderColor={BOX_STROKE}
      medianColor={BOX_STROKE}
      medianWidth={BOX_STROKE_WIDTH}
      whiskerColor={BOX_STROKE}
      whiskerWidth={BOX_STROKE_WIDTH}
      whiskerEndSize={1}
      tooltip={Tooltip}
      animate={false}
      axisBottom={{ tickValues: thinTicks(stats.map(s => s.id)) }}
      axisLeft={{ tickValues: ticks }}
      gridYValues={ticks}
    />
  );
}

export default { settleMode: 'raf' as const, Chart };
