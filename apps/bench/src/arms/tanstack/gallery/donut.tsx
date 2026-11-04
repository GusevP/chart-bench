import { defineChart } from '@tanstack/charts';
import { pie, polar, radialArc } from '@tanstack/charts/polar';
import { Chart as TanChart } from '@tanstack/charts/react';
import { tooltip } from '@tanstack/charts/tooltip';
import { useMemo } from 'react';

import type { GalleryChartProps } from '../../../data/contract';
import { MARGIN } from '../../../data/spec';
import { INNER_RATIO } from '../../shared/donut';

function Chart({ width, height, data }: GalleryChartProps<'donut'>) {
  const definition = useMemo(() => {
    const ids = data.slices.map(s => s.id);
    const slices = pie(data.slices, { value: 'value', startAngle: 0, endAngle: 2 * Math.PI, gapAngle: 0 });
    return defineChart({
      marks: [
        polar({
          radiusRatio: 1,
          marks: [
            radialArc(slices, {
              innerRadius: ({ radius }) => radius * INNER_RATIO,
              cornerRadius: 0,
              color: 'id',
              key: 'id',
            }),
          ],
          scales: { angle: null, radius: null },
        }),
      ],
      scales: { x: null, y: null },
      color: { domain: ids, range: data.slices.map(s => s.color) },
      margin: MARGIN,
      tooltip,
    });
  }, [data]);

  return <TanChart definition={definition} width={width} height={height} ariaLabel="Donut chart" />;
}

export default { settleMode: 'raf' as const, Chart };
