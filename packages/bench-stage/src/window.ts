export const MARK_START = 'bench:start';
export const MARK_SETTLED = 'bench:settled';
export const MEASURE = 'bench:mount';

export type BenchStageApi = {
  mount: () => void;
  remount: () => void;
};

export type BenchWindow = Window & {
  benchStage?: BenchStageApi;
  benchStageReady?: boolean;
  benchStageSettled?: boolean;
};

export const benchWindow = (): BenchWindow => window;
