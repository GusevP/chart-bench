import { appendFileSync, mkdirSync } from 'node:fs';

import { test } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import { measureHover, measureMount } from 'bench-stage/playwright';

const ARMS = (process.env.BENCH_ARMS ?? 'none,nivo,recharts,echarts,visx,tanstack,chartjs').split(',');
const SIZES = (process.env.BENCH_SIZES ?? 'typical,heavy,huge').split(',');
const CASES = ['survival', 'scatter'].flatMap(chart =>
  ['typical', 'heavy', 'huge'].filter(size => SIZES.includes(size)).map(size => ({ chart, size })),
);
const REPEATS = Number(process.env.BENCH_REPEATS ?? 9);
const OUT = process.env.BENCH_OUT ?? 'results/raw.jsonl';
const CPU_THROTTLE = Number(process.env.BENCH_CPU_THROTTLE ?? 1);
const TIMEOUT_MS = Number(process.env.BENCH_TIMEOUT_MS ?? 60_000);
// Five of nine runs over the cap already put the median over it.
const MAX_TIMEOUTS = Math.ceil(REPEATS / 2);

mkdirSync('results', { recursive: true });

class Timeout extends Error {}

const within = <T>(promise: Promise<T>) =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Timeout()), TIMEOUT_MS)),
  ]);

// A fresh page per attempt: a chart still drawing past the cap leaves its renderer busy,
// and closing the page is the only reliable way to stop it.
async function attempt(context: BrowserContext, url: string) {
  const page = await context.newPage();
  const errors: Error[] = [];
  page.on('pageerror', error => errors.push(error));
  try {
    if (CPU_THROTTLE > 1) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
    }
    await page.goto(url);
    const mount = await measureMount(page, { timeout: TIMEOUT_MS }).catch(error => {
      if (error instanceof Error && error.name === 'TimeoutError') throw new Timeout();
      throw error;
    });
    const naiveMs = await within(
      page.evaluate(() => {
        const start = performance.getEntriesByName('bench:start').at(-1)!.startTime;
        const naive = performance.getEntriesByName('bench:naive').findLast(e => e.startTime >= start);
        return naive ? naive.startTime - start : Number.NaN;
      }),
    );
    const hover = await within(measureHover(page)).catch(error => {
      if (error instanceof Timeout) return { maxFrameMs: Number.NaN, hoverTimedOut: true };
      throw error;
    });
    // A chart that throws can still reach "settled" and would be recorded as fast.
    if (errors.length) throw errors[0];
    return { naiveMs, ...mount, ...hover };
  } finally {
    await page.close({ runBeforeUnload: false }).catch(() => {});
  }
}

for (const arm of ARMS) {
  for (const { chart, size } of CASES) {
    test(`${arm} ${chart}-${size}`, async ({ context }) => {
      test.setTimeout((REPEATS + 1) * 3 * TIMEOUT_MS);
      const url = `/${arm}.html?chart=${chart}&size=${size}`;
      const record = (row: object) =>
        appendFileSync(OUT, JSON.stringify({ arm, chart, size, cpuThrottle: CPU_THROTTLE, ...row }) + '\n');

      // One unrecorded run so the JIT and the HTTP cache are warm for every arm alike.
      await attempt(context, url).catch(error => {
        if (!(error instanceof Timeout)) throw error;
      });

      let timeouts = 0;
      for (let run = 0; run < REPEATS && timeouts < MAX_TIMEOUTS; run++) {
        try {
          record({ run, ...(await attempt(context, url)) });
        } catch (error) {
          if (!(error instanceof Timeout)) throw error;
          timeouts++;
          record({ run, timedOut: true, timeoutMs: TIMEOUT_MS });
        }
      }
    });
  }
}
