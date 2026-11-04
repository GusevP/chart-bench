import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    emptyOutDir: false,
    rollupOptions: { input: { gallery: resolve(import.meta.dirname, 'gallery.html') } },
  },
});
