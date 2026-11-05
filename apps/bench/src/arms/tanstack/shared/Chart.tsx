import type { ChartValue, DomChartDefinition } from '@tanstack/charts';
import { motion } from '@tanstack/charts/motion';
import { Chart as SvgChart } from '@tanstack/charts/react';
import { Chart as RendererChart } from '@tanstack/charts/react/core';

import { EFFECTS } from '../../../data/effects';

const renderer = motion();

export function Chart<TDatum, TX extends ChartValue = ChartValue, TY extends ChartValue = ChartValue>(props: {
  definition: DomChartDefinition<TDatum, TX, TY>;
  width: number;
  height: number;
  ariaLabel: string;
}) {
  return EFFECTS ? <RendererChart {...props} renderer={renderer} /> : <SvgChart {...props} />;
}
