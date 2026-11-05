import { Line } from '@nivo/line';
import type { LineCustomSvgLayer, SliceTooltipProps } from '@nivo/line';
import { ScatterPlot } from '@nivo/scatterplot';
import type { ScatterPlotNodeProps } from '@nivo/scatterplot';
import { bisector } from 'd3-array';
import { area, curveStepAfter } from 'd3-shape';
import { useMemo } from 'react';

import type {
  Arm,
  ScatterChartProps,
  ScatterPoint,
  SurvivalChartProps,
  SurvivalPoint,
  SurvivalSeries,
} from '../../data/contract';
import { EFFECTS } from '../../data/effects';
import { MARGIN } from '../../data/spec';

type NivoSurvivalSeries = { id: string; color: string; data: SurvivalPoint[] };

const Bands: LineCustomSvgLayer<NivoSurvivalSeries> = ({ series, xScale, yScale }) => {
  const band = area<SurvivalPoint>()
    .curve(curveStepAfter)
    .x(d => xScale(d.x))
    .y0(d => yScale(d.lower))
    .y1(d => yScale(d.upper));
  return (
    <g>
      {series.map(s => (
        <path key={s.id} d={band(s.data.map(d => d.data)) ?? undefined} fill={s.color} fillOpacity={0.15} />
      ))}
    </g>
  );
};

const CensorTicks: LineCustomSvgLayer<NivoSurvivalSeries> = ({ series }) => (
  <g>
    {series.map(s =>
      s.data
        .filter(d => d.data.censored)
        .map(d => (
          <line
            key={`${s.id}-${d.data.x}`}
            x1={d.position.x}
            x2={d.position.x}
            y1={d.position.y - 4}
            y2={d.position.y + 4}
            stroke={s.color}
            strokeWidth={1.5}
          />
        )),
    )}
  </g>
);

const byX = bisector<SurvivalPoint, number>(p => p.x);

// Series don't share x values, so a nivo slice only holds the series that have a point at that x;
// every other series' step value has to be looked up.
function sliceTooltipFor(series: SurvivalSeries[]) {
  return function SliceTooltip({ slice }: SliceTooltipProps<NivoSurvivalSeries>) {
    const x = slice.points[0]?.data.x ?? 0;
    return (
      <div style={{ background: 'white', border: '1px solid #ccc', padding: '4px 8px', fontSize: 12 }}>
        <strong>Day {x}</strong>
        {series.map(s => {
          const p = s.points[byX.right(s.points, x) - 1];
          return (
            <div key={s.id} style={{ color: s.color }}>
              {s.id}: {p ? p.y.toFixed(3) : '–'}
            </div>
          );
        })}
      </div>
    );
  };
}

function Survival({ width, height, series }: SurvivalChartProps) {
  const data = useMemo(
    () => series.map((s): NivoSurvivalSeries => ({ id: s.id, color: s.color, data: s.points })),
    [series],
  );
  const sliceTooltip = useMemo(() => sliceTooltipFor(series), [series]);
  const lastX = Math.max(...series.map(s => s.points.at(-1)?.x ?? 0));

  return (
    <Line<NivoSurvivalSeries>
      width={width}
      height={height}
      margin={MARGIN}
      data={data}
      animate={EFFECTS}
      curve="stepAfter"
      colors={{ datum: 'color' }}
      lineWidth={1.5}
      enablePoints={false}
      xScale={{ type: 'linear', min: 0, max: lastX, nice: false }}
      yScale={{ type: 'linear', min: 0, max: 1 }}
      enableGridX={false}
      axisBottom={{ legend: 'Days', legendPosition: 'middle', legendOffset: 36 }}
      axisLeft={{ legend: 'Survival', legendPosition: 'middle', legendOffset: -44 }}
      enableSlices="x"
      sliceTooltip={sliceTooltip}
      layers={['grid', 'axes', Bands, 'lines', CensorTicks, 'crosshair', 'slices']}
    />
  );
}

function ScatterNode({ node }: ScatterPlotNodeProps<ScatterPoint>) {
  return <circle cx={node.x} cy={node.y} r={node.size / 2} fill={node.color} fillOpacity={0.7} />;
}

function Scatter({ width, height, series }: ScatterChartProps) {
  const data = useMemo(() => series.map(s => ({ id: s.id, data: s.points })), [series]);
  const colorById = useMemo(() => new Map(series.map(s => [s.id, s.color])), [series]);

  return (
    <ScatterPlot<ScatterPoint>
      width={width}
      height={height}
      margin={MARGIN}
      data={data}
      animate={EFFECTS}
      colors={({ serieId }) => colorById.get(String(serieId)) ?? 'black'}
      nodeSize={n => n.data.size * 2}
      nodeComponent={ScatterNode}
      xFormat=">-.2f"
      yFormat=">-.2f"
      xScale={{ type: 'linear', min: 'auto', max: 'auto', nice: true }}
      yScale={{ type: 'linear', min: 'auto', max: 'auto', nice: true }}
      enableGridX={false}
      axisBottom={{ legend: 'X', legendPosition: 'middle', legendOffset: 36 }}
      axisLeft={{ legend: 'Y', legendPosition: 'middle', legendOffset: -44 }}
    />
  );
}

export const arm: Arm = { settleMode: 'raf', Survival, Scatter };
