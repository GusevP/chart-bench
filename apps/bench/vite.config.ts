import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export const ARMS = ['shell', 'none', 'nivo', 'recharts', 'echarts', 'visx', 'tanstack', 'chartjs'] as const;

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      input: Object.fromEntries(ARMS.map(arm => [arm, resolve(import.meta.dirname, `${arm}.html`)])),
    },
  },
});
