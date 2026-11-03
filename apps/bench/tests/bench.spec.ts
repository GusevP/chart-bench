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
const CPU_THROTTLE = Number(process.env.BENCH_CPU_THROTTLE ?? 1);

mkdirSync('results', { recursive: true });

for (const arm of ARMS) {
  for (const { chart, size } of CASES) {
    test(`${arm} ${chart}-${size}`, async ({ page }) => {
      // A chart that throws can still reach "settled" and would be recorded as fast.
      const errors: Error[] = [];
      page.on('pageerror', error => errors.push(error));
      if (CPU_THROTTLE > 1) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
      }
      const url = `/${arm}.html?chart=${chart}&size=${size}`;
      // One unrecorded run so the JIT and the HTTP cache are warm for every arm alike.
      await page.goto(url);
      await measureMount(page);

      for (let run = 0; run < REPEATS; run++) {
        await page.goto(url);
        const mount = await measureMount(page);
        const naiveMs = await page.evaluate(() => {
          const start = performance.getEntriesByName('bench:start').at(-1)!.startTime;
          const naive = performance.getEntriesByName('bench:naive').findLast(e => e.startTime >= start);
          return naive ? naive.startTime - start : Number.NaN;
        });
        const hover = await measureHover(page);
        if (errors.length) throw errors[0];
        appendFileSync(OUT, JSON.stringify({ arm, chart, size, run, cpuThrottle: CPU_THROTTLE, naiveMs, ...mount, ...hover }) + '\n');
      }
    });
  }
}
