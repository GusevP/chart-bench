import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { measureMount } from 'bench-stage/playwright';
import { summarize } from 'bench-stage/stats';

import type { SurvivalSeries } from '../src/data/contract';
import { DATASETS, generateSurvival } from '../src/data/generate';
import { nudge } from '../src/playground/parse';
import type { Parsed } from '../src/playground/parse';

type Result = {
  type: string;
  runId?: number;
  mode?: string;
  mountMs?: number;
  domNodes?: number;
  updateMs?: number;
  message?: string;
};
type Mode = 'mount' | 'update';
type Settle = 'raf' | 'signal';

const series = generateSurvival(DATASETS.survival.typical);
const nudged = (nudge({ chart: 'survival', series }) as Extract<Parsed, { chart: 'survival' }>).series;

async function openLab(page: Page, src: string) {
  await page.goto('/calibrate.html');
  await page.evaluate(async src => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const inbox: Result[] = [];
    const waiting = new Set<() => void>();
    window.addEventListener('message', e => {
      if (e.source !== frame.contentWindow) return;
      inbox.push(e.data);
      waiting.forEach(check => check());
    });
    const next = (pred: (m: Result) => boolean) =>
      new Promise<Result>(resolve => {
        const check = () => {
          const hit = inbox.find(pred);
          if (!hit) return;
          waiting.delete(check);
          resolve(hit);
        };
        waiting.add(check);
        check();
      });
    const lab = {
      next,
      send: (runId: number, mode: string, updateSettle: string, series: unknown) =>
        frame.contentWindow!.postMessage(
          { type: 'bench:data', runId, mode, updateSettle, chart: 'survival', series },
          location.origin,
        ),
    };
    Object.assign(window, { lab });
    const ready = next(m => m.type === 'bench:ready');
    frame.src = src;
    await ready;
  }, src);

  type Lab = {
    next: (pred: (m: Result) => boolean) => Promise<Result>;
    send: (runId: number, mode: string, updateSettle: string, series: unknown) => void;
  };
  return {
    post: (runId: number, mode: Mode, updateSettle: Settle, data: SurvivalSeries[]) =>
      page.evaluate(
        ([runId, mode, updateSettle, data]) =>
          (window as unknown as { lab: Lab }).lab.send(runId, mode, updateSettle, data),
        [runId, mode, updateSettle, data] as const,
      ),
    result: (type: string, mode?: Mode) =>
      page.evaluate(
        ([type, mode]) =>
          (window as unknown as { lab: Lab }).lab.next(m => m.type === type && (!mode || m.mode === mode)),
        [type, mode] as const,
      ),
  };
}

async function framePeriod(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>(resolve => {
        const gaps: number[] = [];
        let last = 0;
        const tick = (now: number) => {
          if (last) gaps.push(now - last);
          last = now;
          if (gaps.length < 30) requestAnimationFrame(tick);
          else resolve(gaps.sort((a, b) => a - b)[gaps.length >> 1]!);
        };
        requestAnimationFrame(tick);
      }),
  );
}

const RUNS = 5;
const COST = 100;

const SLACK = 5;
const SIGNAL_WAIT = 50;

async function medianOf(sample: () => Promise<number>) {
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i++) samples.push(await sample());
  return summarize(samples).median;
}

function expectKnownCost(base: number, loaded: number, F: number, wait = 0) {
  console.log(
    `base=${base.toFixed(1)} loaded=${loaded.toFixed(1)} F=${F.toFixed(1)} delta=${(loaded - base).toFixed(1)}`,
  );
  expect(base).toBeGreaterThan(wait > 0 ? wait : F / 2);
  expect(base).toBeLessThanOrEqual(wait + 2 * F + SLACK);
  expect(loaded).toBeGreaterThanOrEqual(wait + COST);
  expect(loaded).toBeLessThanOrEqual(wait + COST + 2 * F + SLACK);
}

test('top-level arm page never loads the embedded chunk', async ({ page }) => {
  await page.goto('/none.html');
  const sample = await measureMount(page);
  expect(sample.mountMs).toBeGreaterThan(0);
  const loaded = await page.evaluate(() =>
    performance.getEntriesByType('resource').some(e => e.name.includes('EmbeddedArmPage')),
  );
  expect(loaded).toBe(false);
});

test('embedded arm page answers mount then update with the sent run id', async ({ page }) => {
  await page.goto('/none.html');
  const harness = await measureMount(page);

  const lab = await openLab(page, '/none.html?embed=lab');
  await lab.post(11, 'mount', 'raf', series);
  const mount = await lab.result('bench:result', 'mount');
  await lab.post(12, 'update', 'raf', nudged);
  const update = await lab.result('bench:result', 'update');

  expect(mount.runId).toBe(11);
  expect(update.runId).toBe(12);
  expect(mount.domNodes).toBe(harness.domNodes);
  expect(mount.mountMs).toBeGreaterThan(0);
  expect(Number.isFinite(update.updateMs)).toBe(true);
  expect(update.updateMs).toBeGreaterThan(0);
});

test('harness mount recovers a known render cost', async ({ page }) => {
  const median = (cost: number) =>
    medianOf(async () => {
      await page.goto(`/calibrate.html?cost=${cost}`);
      return (await measureMount(page)).mountMs;
    });
  const base = await median(0);
  const loaded = await median(COST);
  expectKnownCost(base, loaded, await framePeriod(page));
});

const updatePaths: { name: string; query: string; settle: Settle }[] = [
  { name: 'raf, render', query: '', settle: 'raf' },
  { name: 'raf, passive effect', query: '&drawIn=effect', settle: 'raf' },
  { name: 'signal', query: '&settle=signal', settle: 'signal' },
];

for (const { name, query, settle } of updatePaths) {
  test(`embedded update recovers a known cost (${name})`, async ({ page }) => {
    const median = (cost: number) =>
      medianOf(async () => {
        const lab = await openLab(page, `/calibrate.html?embed=lab&cost=${cost}${query}`);
        await lab.post(1, 'mount', settle, series);
        await lab.result('bench:result', 'mount');
        await lab.post(2, 'update', settle, nudged);
        return (await lab.result('bench:result', 'update')).updateMs!;
      });
    const base = await median(0);
    const loaded = await median(COST);
    expectKnownCost(base, loaded, await framePeriod(page), settle === 'signal' ? SIGNAL_WAIT : 0);
  });
}

test('a render error is reported with the run id of the mount that threw', async ({ page }) => {
  const lab = await openLab(page, '/calibrate.html?embed=lab&throw=1');
  await lab.post(7, 'mount', 'raf', series);
  const error = await lab.result('bench:error');
  expect(error.runId).toBe(7);
  expect(error.message).toContain('calibrate');
});

async function measureInPlayground(page: Page, query: string, libs: string[]) {
  await page.goto(`/index.html?${query}`);
  await page.getByRole('button', { name: 'Render' }).click();
  return summaries(page, libs);
}

async function summaries(page: Page, libs: string[]) {
  const out: Record<string, { n: number; mount: number; update: number; blocking: number | null }> = {};
  for (const lib of libs) {
    const li = page.locator(`[data-summaries] li[data-lib="${lib}"]`);
    await li.waitFor({ timeout: 120_000 });
    const num = async (name: string) => Number(await li.getAttribute(`data-${name}`));
    const blocking = await li.getAttribute('data-blocking');
    out[lib] = {
      n: await num('samples'),
      mount: await num('mount'),
      update: await num('update'),
      blocking: blocking ? Number(blocking) : null,
    };
  }
  return out;
}

test('playground lab recovers a known mount cost', async ({ page }) => {
  const median = async (cost: number) =>
    (await measureInPlayground(page, `libs=calibrate&cost=${cost}`, ['calibrate'])).calibrate!.mount;
  const base = await median(0);
  const loaded = await median(COST);
  expectKnownCost(base, loaded, await framePeriod(page));
});

test('playground lab reports main-thread blocking for a long task', async ({ page }) => {
  const { calibrate } = await measureInPlayground(page, 'libs=calibrate&cost=150', ['calibrate']);
  const loaf = await page.evaluate(() =>
    PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'),
  );
  test.skip(!loaf, 'LoAF unsupported');
  expect(calibrate!.n).toBe(5);
  expect(calibrate!.blocking).toBeGreaterThanOrEqual(80);
  expect(calibrate!.blocking).toBeLessThanOrEqual(150 + 2 * (await framePeriod(page)));
});

test('only the lab frame exists while measuring', async ({ page }) => {
  await page.goto('/index.html?libs=none,recharts');
  const counts = page.evaluate(
    () =>
      new Promise<number[]>(resolve => {
        const seen: number[] = [];
        const id = setInterval(() => {
          if (document.querySelector('[data-summaries]')) {
            clearInterval(id);
            resolve(seen);
          } else if (document.querySelector('[data-lab]'))
            seen.push(document.querySelectorAll('[data-lab] iframe, .card iframe').length);
        }, 5);
      }),
  );
  await page.getByRole('button', { name: 'Render' }).click();
  const seen = await counts;
  expect(seen.length).toBeGreaterThan(10);
  expect(Math.max(...seen)).toBe(1);
  await expect(page.locator('[data-lab]')).toHaveCount(0);
});

test('results carrying a stale run id are ignored', async ({ page }) => {
  await page.goto('/index.html?libs=none');
  await page.evaluate(() => {
    const stale = (runId: number) =>
      [
        { type: 'bench:result', runId, mode: 'mount', mountMs: 1e6, blockingMs: 0, domNodes: 1 },
        { type: 'bench:result', runId, mode: 'update', updateMs: 1e6 },
      ].map(m => `parent.postMessage(${JSON.stringify(m)}, location.origin)`);
    setInterval(() => {
      const frame = document.querySelector<HTMLIFrameElement>('[data-lab] iframe');
      const current = Number(frame?.dataset.runId);
      if (!frame || !current) return;
      try {
        for (const code of stale(current - 1)) (frame.contentWindow as any).eval(code);
      } catch {}
    }, 2);
  });
  await page.getByRole('button', { name: 'Render' }).click();
  const { none } = await summaries(page, ['none']);
  expect(none!.n).toBe(5);
  expect(none!.mount).toBeLessThan(1000);
  expect(none!.update).toBeLessThan(1000);
});

test('a tab hidden mid-run repeats the run and still yields every sample', async ({ page }) => {
  await page.goto('/index.html?libs=none');
  await page.evaluate(() => {
    let state = 'visible';
    const set = (next: string) => {
      state = next;
      document.dispatchEvent(new Event('visibilitychange'));
    };
    Object.defineProperty(document, 'visibilityState', { get: () => state, configurable: true });
    const w = window as unknown as { maxRun: number };
    w.maxRun = 0;
    let fired = false;
    setInterval(() => {
      const run = Number(document.querySelector<HTMLIFrameElement>('[data-lab] iframe')?.dataset.runId);
      if (run > w.maxRun) w.maxRun = run;
      if (run !== 3 || fired) return;
      fired = true;
      set('hidden');
      setTimeout(() => set('visible'), 300);
    }, 2);
  });
  await page.getByRole('button', { name: 'Render' }).click();
  const { none } = await summaries(page, ['none']);
  expect(none!.n).toBe(5);
  // shell + none = 2 libraries x (1 warm-up + 5) runs x 2 ids; an aborted run consumes more
  expect(await page.evaluate(() => (window as unknown as { maxRun: number }).maxRun)).toBeGreaterThan(24);
});
