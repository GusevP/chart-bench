import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { ARMS } from './src/data/arms.ts';

export default defineConfig({
  base: './',
  plugins: [react()],
  // Gallery charts load through import.meta.glob, which the dev optimizer only finds on first use;
  // its re-bundle then reloads the page and the chart frames lose the data already posted to them.
  optimizeDeps: { entries: ['*.html', 'src/arms/*/gallery/*.tsx'] },
  build: {
    manifest: true,
    emptyOutDir: false,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        ...Object.fromEntries(ARMS.map(arm => [arm, resolve(import.meta.dirname, `${arm}.html`)])),
        calibrate: resolve(import.meta.dirname, 'calibrate.html'),
      },
    },
  },
});
