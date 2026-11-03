import { appendFileSync, mkdirSync } from 'node:fs';

import { test } from '@playwright/test';
import { measureHover, measureMount } from 'bench-stage/playwright';

const ARMS = (process.env.BENCH_ARMS ?? 'none,nivo,recharts,echarts,visx,tanstack,chartjs').split(',');
const CASES = [
  { chart: 'survival', size: 'typical' },
  { chart: 'survival', size: 'heavy' },
  { chart: 'scatter', size: 'typical' },
  { chart: 'scatter', size: 'heavy' },
] as const;
const REPEATS = Number(process.env.BENCH_REPEATS ?? 9);
const OUT = process.env.BENCH_OUT ?? 'results/raw.jsonl';

mkdirSync('results', { recursive: true });

for (const arm of ARMS) {
  for (const { chart, size } of CASES) {
    test(`${arm} ${chart}-${size}`, async ({ page }) => {
      const url = `/${arm}.html?chart=${chart}&size=${size}`;
      // One unrecorded run so the JIT and the HTTP cache are warm for every arm alike.
      await page.goto(url);
      await measureMount(page);

      for (let run = 0; run < REPEATS; run++) {
        await page.goto(url);
        const mount = await measureMount(page);
        const hover = await measureHover(page);
        appendFileSync(OUT, JSON.stringify({ arm, chart, size, run, ...mount, ...hover }) + '\n');
      }
    });
  }
}
