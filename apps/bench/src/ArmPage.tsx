import { BenchStage } from 'bench-stage';
import { useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { Arm, ScatterSeries, SurvivalSeries } from './data/contract';
import type { RenderChart } from './EmbeddedArmPage';
import { DATASETS, generateScatter, generateSurvival } from './data/generate';
import type { ChartKind, DatasetSize } from './data/generate';

export const WIDTH = 900;
export const HEIGHT = 600;

export type Payload =
  { chart: 'survival'; series: SurvivalSeries[] } | { chart: 'scatter'; series: ScatterSeries[] };

export function fromUrl(): Payload {
  const params = new URLSearchParams(location.search);
  const chart: ChartKind = params.get('chart') === 'scatter' ? 'scatter' : 'survival';
  const size: DatasetSize = params.get('size') === 'heavy' ? 'heavy' : 'typical';
  return chart === 'survival'
    ? { chart, series: generateSurvival(DATASETS.survival[size]) }
    : { chart, series: generateScatter(DATASETS.scatter[size]) };
}

// The timestamp a naive instrument would take: at commit for SVG, on the library's own
// "done" signal for Canvas. Recorded beside the paint-confirmed one to show the gap.
const NAIVE = 'bench:naive';
export const markNaive = () => {
  performance.mark(NAIVE);
};

export function CommitMark() {
  useLayoutEffect(markNaive, []);
  return null;
}

const renderArm =
  (arm: Arm): RenderChart =>
  (payload, onSettled) =>
    payload.chart === 'survival' ? (
      <arm.Survival width={WIDTH} height={HEIGHT} series={payload.series} onSettled={onSettled} />
    ) : (
      <arm.Scatter width={WIDTH} height={HEIGHT} series={payload.series} onSettled={onSettled} />
    );

function ArmPage({ arm }: { arm: Arm }) {
  const [payload] = useState<Payload>(fromUrl);
  return (
    <BenchStage width={WIDTH} height={HEIGHT} settleMode={arm.settleMode}>
      {({ onSettled }) => {
        const settled = () => {
          markNaive();
          onSettled();
        };
        return (
          <>
            {renderArm(arm)(payload, settled)}
            {arm.settleMode === 'raf' && <CommitMark />}
          </>
        );
      }}
    </BenchStage>
  );
}

export function mountArm(arm: Arm) {
  if (window.parent !== window) {
    void import('./EmbeddedArmPage').then(m => m.mountEmbedded(arm.settleMode, renderArm(arm)));
    return;
  }
  createRoot(document.getElementById('root')!).render(<ArmPage arm={arm} />);
}
