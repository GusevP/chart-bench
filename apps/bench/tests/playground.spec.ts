import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { measureMount } from 'bench-stage/playwright';
import { summarize } from 'bench-stage/stats';

import type { SurvivalSeries } from '../src/data/contract';
import { DATASETS, generateSurvival } from '../src/data/generate';
import { framePeriod } from '../src/playground/frame';
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
  expectKnownCost(base, loaded, await page.evaluate(framePeriod));
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
    expectKnownCost(base, loaded, await page.evaluate(framePeriod), settle === 'signal' ? SIGNAL_WAIT : 0);
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
  const out: Record<
    string,
    { n: number; mount: number; update: number; blocking: number | null; domNodes: number }
  > = {};
  for (const lib of libs) {
    const li = page.locator(`[data-summaries] tr[data-lib="${lib}"]`);
    await li.waitFor({ timeout: 120_000 });
    const num = async (name: string) => Number(await li.getAttribute(`data-${name}`));
    const blocking = await li.getAttribute('data-blocking');
    out[lib] = {
      n: await num('samples'),
      mount: await num('mount'),
      update: await num('update'),
      blocking: blocking ? Number(blocking) : null,
      domNodes: await num('dom-nodes'),
    };
  }
  return out;
}

test('playground lab recovers a known mount cost', async ({ page }) => {
  const median = async (cost: number) =>
    (await measureInPlayground(page, `libs=calibrate&cost=${cost}`, ['calibrate'])).calibrate!.mount;
  const base = await median(0);
  const loaded = await median(COST);
  expectKnownCost(base, loaded, await page.evaluate(framePeriod));
});

test('playground lab reports main-thread blocking for a long task', async ({ page }) => {
  const { calibrate } = await measureInPlayground(page, 'libs=calibrate&cost=150', ['calibrate']);
  const loaf = await page.evaluate(() =>
    PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'),
  );
  test.skip(!loaf, 'LoAF unsupported');
  expect(calibrate!.n).toBe(5);
  expect(calibrate!.blocking).toBeGreaterThanOrEqual(80);
  expect(calibrate!.blocking).toBeLessThanOrEqual(150 + 2 * (await page.evaluate(framePeriod)));
});

test('playground lab measures chartjs on its own page after another library', async ({ page }) => {
  const { none, chartjs } = await measureInPlayground(page, 'libs=none,chartjs', ['none', 'chartjs']);
  console.log(`none nodes=${none!.domNodes} chartjs nodes=${chartjs!.domNodes}`);
  expect(chartjs!.n).toBe(5);
  expect(Number.isFinite(chartjs!.mount)).toBe(true);
  expect(Number.isFinite(chartjs!.update)).toBe(true);
  expect(chartjs!.domNodes).toBeGreaterThan(0);
  expect(chartjs!.domNodes).not.toBe(none!.domNodes);
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

test('a lab scrolled out of view mid-run repeats the run and still yields every sample', async ({ page }) => {
  await page.goto('/index.html?libs=none');
  await page.evaluate(() => {
    document.body.append(Object.assign(document.createElement('div'), { style: 'height: 4000px' }));
    const w = window as unknown as { maxRun: number };
    w.maxRun = 0;
    let fired = false;
    setInterval(() => {
      const run = Number(document.querySelector<HTMLIFrameElement>('[data-lab] iframe')?.dataset.runId);
      if (run > w.maxRun) w.maxRun = run;
      if (run !== 3 || fired) return;
      fired = true;
      scrollTo(0, 3000);
      setTimeout(() => scrollTo(0, 0), 300);
    }, 2);
  });
  await page.getByRole('button', { name: 'Render' }).click();
  const { none } = await summaries(page, ['none']);
  expect(none!.n).toBe(5);
  expect(await page.evaluate(() => (window as unknown as { maxRun: number }).maxRun)).toBeGreaterThan(24);
});

// shell + none = 2 libraries x (1 warm-up + 5) runs; the last update result is followed only by the LoAF drain
const FINAL_UPDATE = 12;

async function holdFinalDrain(page: Page) {
  await page.goto('/index.html?libs=none');
  const loaf = await page.evaluate(() =>
    PerformanceObserver.supportedEntryTypes.includes('long-animation-frame'),
  );
  test.skip(!loaf, 'LoAF unsupported');
  await page.evaluate(final => {
    const w = window as unknown as { held: boolean; release: () => void; maxRun: number };
    const raf = window.requestAnimationFrame;
    const queued: FrameRequestCallback[] = [];
    w.maxRun = 0;
    let updates = 0;
    window.addEventListener('message', e => {
      if (e.data?.type !== 'bench:result') return;
      w.maxRun = Math.max(w.maxRun, e.data.runId);
      if (e.data.mode !== 'update' || ++updates !== final) return;
      window.requestAnimationFrame = cb => queued.push(cb);
      w.held = true;
    });
    w.release = () => {
      window.requestAnimationFrame = raf;
      queued.splice(0).forEach(cb => raf(cb));
    };
  }, FINAL_UPDATE);
  await page.getByRole('button', { name: 'Render' }).click();
  await page.waitForFunction(() => (window as unknown as { held: boolean }).held);
}

test('cancel during the final LoAF drain discards the run', async ({ page }) => {
  await holdFinalDrain(page);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await page.evaluate(() => (window as unknown as { release: () => void }).release());
  await page.waitForTimeout(300);
  await expect(page.locator('[data-lab]')).toHaveCount(0);
  await expect(page.locator('[data-summaries]')).toHaveCount(0);
});

test('a tab hidden during the final LoAF drain repeats that run', async ({ page }) => {
  await holdFinalDrain(page);
  await page.evaluate(() => {
    let state = 'hidden';
    Object.defineProperty(document, 'visibilityState', { get: () => state, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    setTimeout(() => {
      state = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      (window as unknown as { release: () => void }).release();
    }, 300);
  });
  const { none } = await summaries(page, ['none']);
  expect(none!.n).toBe(5);
  expect(await page.evaluate(() => (window as unknown as { maxRun: number }).maxRun)).toBeGreaterThan(
    2 * FINAL_UPDATE,
  );
});

test('render shows a results table, then display cards', async ({ page }) => {
  const bundle = JSON.parse(
    readFileSync(new URL('../results/bundle.json', import.meta.url), 'utf8'),
  ) as Record<string, { libraryKb: number }>;
  await page.goto('/index.html?libs=none,recharts');
  await page.getByRole('button', { name: 'Render' }).click();
  const rows = page.locator('[data-summaries] tbody tr');
  await expect(rows).toHaveCount(3, { timeout: 120_000 });
  const { none, recharts } = await summaries(page, ['none', 'recharts']);
  for (const r of [none!, recharts!]) {
    expect(Number.isFinite(r.mount)).toBe(true);
    expect(Number.isFinite(r.update)).toBe(true);
  }
  await expect(page.locator('tr[data-lib="none"] td').nth(4)).toHaveText(bundle.none!.libraryKb.toFixed(1));
  await expect(page.locator('tr[data-lib="recharts"] td').nth(4)).toHaveText(
    bundle.recharts!.libraryKb.toFixed(1),
  );
  await expect(page.locator('tr[data-lib="shell (floor)"] td').nth(4)).toHaveText('0.0');
  await expect(page.locator('[data-summaries] td.noise').first()).toBeVisible();
  await expect(page.locator('.card iframe')).toHaveCount(2);
  await expect(page.locator('.card [data-card-stats]').first()).toContainText(
    `mount ${none!.mount.toFixed(1)}`,
  );
  expect(await page.locator('.card iframe').first().getAttribute('src')).toContain('embed=display');
});

test('loading a sample after a measurement leaves the measured cards alone', async ({ page }) => {
  await measureInPlayground(page, 'libs=none', ['none']);
  const card = page.frames().find(f => f.url().includes('/none.html') && f.url().includes('embed=display'));
  await card!.evaluate(() => {
    const w = window as unknown as { posts: number };
    w.posts = 0;
    window.addEventListener('message', e => e.data?.type === 'bench:data' && w.posts++);
  });
  await page.getByRole('button', { name: 'Sample: heavy' }).click();
  await page.getByLabel('Scatter').check();
  await page.waitForTimeout(300);
  expect(await card!.evaluate(() => (window as unknown as { posts: number }).posts)).toBe(0);
});

test('invalid JSON shows the parse error and starts no measurement', async ({ page }) => {
  await page.goto('/index.html?libs=none');
  await page.getByLabel('Chart data as JSON').fill('{not json');
  await page.getByRole('button', { name: 'Render' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('[data-lab]')).toHaveCount(0);
  await expect(page.locator('[data-summaries]')).toHaveCount(0);
});

async function sweepCard(page: Page, lib: string) {
  const frame = page.locator('.frame', { has: page.locator(`iframe[src^="${lib}.html"]`) });
  const card = frame.locator('iframe');
  await card.scrollIntoViewIfNeeded();
  const box = (await card.boundingBox())!;
  const visible = (await frame.boundingBox())!;
  const width = Math.min(box.width, visible.x + visible.width - box.x);
  const y = box.y + box.height / 2;
  for (let i = 0; i <= 60; i++) {
    await page.mouse.move(box.x + 20 + ((width - 40) * i) / 60, y + Math.sin(i / 4) * box.height * 0.3);
  }
  const cell = page.locator(`tr[data-lib="${lib}"] td[data-hover]`);
  await expect(cell).not.toHaveAttribute('data-hover', '');
  const ms = Number(await cell.getAttribute('data-hover'));
  console.log(`hover ${lib} ${ms.toFixed(1)}`);
  return ms;
}

test('hovering a display card fills the hover column with the worst frame', async ({ page }) => {
  await measureInPlayground(page, 'libs=calibrate&hoverCost=100', ['calibrate']);
  await expect(page.locator('tr[data-lib="calibrate"] td[data-hover]')).toHaveText('hover a chart');
  expect(await sweepCard(page, 'calibrate')).toBeGreaterThanOrEqual(100);
});

test('hovering a cheap display card stays within two frames', async ({ page }) => {
  await measureInPlayground(page, 'libs=calibrate&hoverCost=0', ['calibrate']);
  const hover = await sweepCard(page, 'calibrate');
  expect(hover).toBeLessThanOrEqual(2 * (await page.evaluate(framePeriod)) + SLACK);
});

test('a display card stops recording once the pointer rests', async ({ page }) => {
  await measureInPlayground(page, 'libs=calibrate&hoverCost=0', ['calibrate']);
  await sweepCard(page, 'calibrate');
  await page.waitForTimeout(600);
  const before = await page.locator('tr[data-lib="calibrate"] td[data-hover]').getAttribute('data-hover');
  const display = page
    .frames()
    .find(f => f.url().includes('/calibrate.html') && f.url().includes('embed=display'));
  await display!.evaluate(
    () =>
      new Promise<void>(done =>
        requestAnimationFrame(() => {
          for (const end = performance.now() + 250; performance.now() < end;);
          done();
        }),
      ),
  );
  await page.waitForTimeout(300);
  await expect(page.locator('tr[data-lib="calibrate"] td[data-hover]')).toHaveAttribute(
    'data-hover',
    before!,
  );
});

test('lab frames never post bench:hover', async ({ page }) => {
  await page.goto('/index.html?libs=calibrate&hoverCost=100');
  await page.evaluate(() => {
    const w = window as unknown as { hovers: unknown[] };
    w.hovers = [];
    window.addEventListener('message', e => {
      if (e.data?.type === 'bench:hover') w.hovers.push(e.data);
    });
  });
  await page.getByRole('button', { name: 'Render' }).click();
  await page.locator('[data-lab]').waitFor();
  for (let i = 0; i < 40; i++) await page.mouse.move(100 + i * 15, 200 + (i % 7) * 40);
  await page.locator('[data-summaries]').waitFor({ timeout: 120_000 });
  expect(await page.evaluate(() => (window as unknown as { hovers: unknown[] }).hovers)).toEqual([]);
});

test('playground lab agrees with the harness on mount and dom nodes', async ({ page }) => {
  await page.goto('/index.html?libs=none,recharts');
  await page.getByRole('button', { name: 'Render' }).click();
  const lab = await summaries(page, ['none', 'recharts']);
  const F = await page.evaluate(framePeriod);
  for (const lib of ['none', 'recharts']) {
    let domNodes = 0;
    const harness = await medianOf(async () => {
      await page.goto(`/${lib}.html?chart=survival&size=typical`);
      const sample = await measureMount(page);
      domNodes = sample.domNodes;
      return sample.mountMs;
    });
    console.log(
      `${lib} harness=${harness.toFixed(1)} lab=${lab[lib]!.mount.toFixed(1)} F=${F.toFixed(1)} nodes=${domNodes}/${lab[lib]!.domNodes}`,
    );
    expect(Math.abs(harness - lab[lib]!.mount)).toBeLessThanOrEqual(2 * F);
    expect(lab[lib]!.domNodes).toBe(domNodes);
  }
});
