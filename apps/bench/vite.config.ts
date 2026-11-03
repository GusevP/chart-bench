import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { ARMS } from './src/data/arms.ts';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        ...Object.fromEntries(ARMS.map(arm => [arm, resolve(import.meta.dirname, `${arm}.html`)])),
        calibrate: resolve(import.meta.dirname, 'calibrate.html'),
      },
    },
  },
});
