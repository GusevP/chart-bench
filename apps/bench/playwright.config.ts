import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  workers: 1,
  retries: 0,
  timeout: 10 * 60_000,
  reporter: 'list',
  use: {
    baseURL: process.env.BENCH_URL ?? 'http://localhost:4173',
    viewport: { width: 1000, height: 700 },
    browserName: 'chromium',
  },
  webServer: process.env.BENCH_URL
    ? undefined
    : { command: 'pnpm run preview', url: 'http://localhost:4173/shell.html', reuseExistingServer: false },
});
