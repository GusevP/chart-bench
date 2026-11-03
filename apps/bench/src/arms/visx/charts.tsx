import type { Arm } from '../../data/contract';

const Empty = ({ width, height }: { width: number; height: number }) => <div style={{ width, height }} />;

export const arm: Arm = { settleMode: 'raf', Survival: Empty, Scatter: Empty };
