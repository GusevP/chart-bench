import type { ComponentType } from 'react';

import { HEIGHT, WIDTH } from './ArmPage';
import { mountEmbedded, toParent } from './EmbeddedArmPage';

type GalleryModule = {
  default: {
    settleMode: 'raf' | 'signal';
    Chart: ComponentType<{ width: number; height: number; data: unknown; onSettled: () => void }>;
  };
};

const modules = import.meta.glob<GalleryModule>('./arms/*/gallery/*.tsx');

const fail = (message: string) => toParent({ type: 'bench:error', runId: null, message });

async function main() {
  const params = new URLSearchParams(location.search);
  const lib = params.get('lib');
  const chart = params.get('chart');
  const load = modules[`./arms/${lib}/gallery/${chart}.tsx`];
  if (!load) return fail(`no gallery chart for ${lib}/${chart}`);
  const { settleMode, Chart } = (await load()).default;
  mountEmbedded(settleMode, (payload, onSettled) => (
    <Chart
      width={WIDTH}
      height={HEIGHT}
      data={'data' in payload ? payload.data : undefined}
      onSettled={onSettled}
    />
  ));
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)));
