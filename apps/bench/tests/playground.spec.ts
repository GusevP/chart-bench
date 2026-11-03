import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { measureMount } from 'bench-stage/playwright';
import { summarize } from 'bench-stage/stats';

import type { SurvivalSeries } from '../src/data/contract';
import { DATASETS, generateSurvival } from '../src/data/generate';

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
const nudged: SurvivalSeries[] = series.map(s => ({
  ...s,
  points: s.points.map(p => ({ ...p, y: p.y * 0.97, lower: p.lower * 0.97, upper: p.upper * 0.97 })),
}));

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
  expect(base).toBeGreaterThan(wait + F / 2);
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
