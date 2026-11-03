import { BenchStage } from 'bench-stage';
import { useEffect, useLayoutEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { Arm, ScatterSeries, SurvivalSeries } from './data/contract';
import { DATASETS, generateScatter, generateSurvival } from './data/generate';
import type { ChartKind, DatasetSize } from './data/generate';

const WIDTH = 900;
const HEIGHT = 600;

type Payload =
  { chart: 'survival'; series: SurvivalSeries[] } | { chart: 'scatter'; series: ScatterSeries[] };

export type DataMessage = { type: 'bench:data' } & Payload;

function fromUrl(): Payload {
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
const markNaive = () => {
  performance.mark(NAIVE);
};

function CommitMark() {
  useLayoutEffect(markNaive, []);
  return null;
}

function ArmPage({ arm }: { arm: Arm }) {
  const [payload, setPayload] = useState<Payload>(fromUrl);
  const [version, setVersion] = useState(0);

  // The playground embeds this page in an iframe and sends the visitor's own data.
  useEffect(() => {
    const onMessage = (event: MessageEvent<DataMessage>) => {
      if (event.origin !== location.origin || event.data?.type !== 'bench:data') return;
      setPayload(event.data);
      setVersion(v => v + 1);
    };
    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'bench:ready' }, location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <BenchStage key={version} width={WIDTH} height={HEIGHT} settleMode={arm.settleMode}>
      {({ onSettled }) => {
        const settled = () => {
          markNaive();
          onSettled();
        };
        return (
          <>
            {payload.chart === 'survival' ? (
              <arm.Survival width={WIDTH} height={HEIGHT} series={payload.series} onSettled={settled} />
            ) : (
              <arm.Scatter width={WIDTH} height={HEIGHT} series={payload.series} onSettled={settled} />
            )}
            {arm.settleMode === 'raf' && <CommitMark />}
          </>
        );
      }}
    </BenchStage>
  );
}

export function mountArm(arm: Arm) {
  createRoot(document.getElementById('root')!).render(<ArmPage arm={arm} />);
}
