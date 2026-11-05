import { TreeMap } from '@nivo/treemap';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { treemapRamp } from '../../shared/treemap';

function Chart({ width, height, data }: GalleryChartProps<'treemap'>) {
  const ramp = useMemo(() => treemapRamp(data), [data]);
  return (
    <div className="crisp">
      <style>{'.crisp rect{shape-rendering:crispEdges}'}</style>
      <TreeMap
        width={width}
        height={height}
        margin={MARGIN}
        data={data}
        tile="squarify"
        leavesOnly
        innerPadding={0}
        outerPadding={0}
        borderWidth={0}
        nodeOpacity={1}
        animate={false}
        enableLabel={false}
        enableParentLabel={false}
        colors={node => ramp(node.value)}
      />
    </div>
  );
}

export default { settleMode: 'raf' as const, Chart };
