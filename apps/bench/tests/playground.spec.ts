import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { measureMount } from 'bench-stage/playwright';
import { summarize } from 'bench-stage/stats';

import { boxplotStats, boxScale, boxStats } from '../src/arms/shared/boxplot';
import { treeLeaves } from '../src/arms/shared/treemap';
import type { SurvivalSeries } from '../src/data/contract';
import { DATASETS, generateSurvival } from '../src/data/generate';
import { framePeriod } from '../src/playground/frame';
import { isGallery, kindInfo, kinds, nudge, parseSeries, sample } from '../src/playground/parse';
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
      setTimeout(() => document.querySelector('[data-lab]')!.scrollIntoView({ block: 'nearest' }), 300);
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

test('gallery page reports bench:error for an unknown pair, and dist holds both builds', async ({ page }) => {
  const shell = await page.request.get('/shell.html');
  expect(shell.ok()).toBe(true);
  expect(await shell.text()).toContain('chart-bench: shell');
  await page.addInitScript(() => {
    (window as unknown as { inbox: unknown[] }).inbox = [];
    window.addEventListener('message', e => (window as unknown as { inbox: unknown[] }).inbox.push(e.data));
  });
  await page.goto('/gallery.html?lib=none&chart=nope');
  const error = await page.waitForFunction(() =>
    (window as unknown as { inbox: Result[] }).inbox.find(m => m.type === 'bench:error'),
  );
  expect(await error.jsonValue()).toMatchObject({ runId: null, message: expect.stringContaining('none/nope') });
});

test('a missing embedded chunk reports its error at once instead of the lab timeout', async ({ page }) => {
  await page.route('**/EmbeddedArmPage-*.js', route => route.fulfill({ status: 404 }));
  await page.goto('/index.html?libs=none');
  await page.getByRole('button', { name: 'Render' }).click();
  await expect(page.getByRole('alert')).toContainText('dynamically imported module', { timeout: 10_000 });
});

const LIBS = ['none', 'nivo', 'recharts', 'echarts', 'visx', 'tanstack', 'chartjs'];
const CANVAS_LIBS = ['echarts', 'chartjs'];
const EXPECTED_PAIRS = ['chartjs', 'echarts', 'nivo', 'recharts', 'tanstack', 'visx'].flatMap(lib => [
  `${lib}/stacked-bar`,
  `${lib}/stacked-area`,
  `${lib}/donut`,
  `${lib}/radar`,
  ...(lib === 'nivo' ? [] : [`${lib}/combo`]),
  ...(lib === 'recharts' ? [] : [`${lib}/heatmap`]),
  `${lib}/treemap`,
  `${lib}/sankey`,
  ...(lib === 'recharts' ? [] : [`${lib}/boxplot`]),
  ...['chartjs', 'echarts', 'tanstack'].includes(lib) ? [`${lib}/candlestick`] : [],
]);

test('gallery-bundle.json matches the expected pairs; supported pairs measure and the rest are Not supported', async ({
  page,
}) => {
  const bundle = JSON.parse(
    readFileSync(new URL('../results/gallery-bundle.json', import.meta.url), 'utf8'),
  ) as Record<string, Record<string, unknown>>;
  const pairs = Object.entries(bundle).flatMap(([lib, types]) => Object.keys(types).map(t => `${lib}/${t}`));
  expect(pairs.sort()).toEqual([...EXPECTED_PAIRS].sort());

  for (const kind of kinds.filter(isGallery)) {
    const libs = LIBS.filter(lib => pairs.includes(`${lib}/${kind}`));
    await page.goto(`/index.html?libs=${LIBS.join(',')}`);
    await page.getByLabel(kindInfo(kind).label).check();
    await page.getByRole('button', { name: 'Render' }).click();
    if (libs.length)
      await expect(page.locator('[data-summaries] tbody tr')).toHaveCount(libs.length + 1, {
        timeout: 300_000,
      });
    for (const lib of LIBS.filter(l => !libs.includes(l)))
      await expect(page.locator(`[data-unsupported="${lib}"]`)).toHaveCount(1);
    await expect(page.locator('[data-unsupported]')).toHaveCount(LIBS.length - libs.length);
    if (libs.length) {
      await expect(page.locator('.card [data-card-stats]')).toHaveCount(libs.length);
      const domNodes = async (lib: string) =>
        Number(await page.locator(`[data-summaries] tr[data-lib="${lib}"]`).getAttribute('data-dom-nodes'));
      const floor = await domNodes('shell (floor)');
      for (const lib of libs) {
        if (!CANVAS_LIBS.includes(lib)) {
          expect(await domNodes(lib), `${lib}/${kind}`).toBeGreaterThan(floor);
          continue;
        }
        const card = `.card iframe[src*="lib=${lib}&"]`;
        await page.locator(card).scrollIntoViewIfNeeded();
        await expect
          .poll(
            () =>
              page
                .frameLocator(card)
                .locator('canvas')
                .evaluateAll((canvases: HTMLCanvasElement[]) =>
                  canvases.some(c => {
                    const { data } = c.getContext('2d')!.getImageData(0, 0, c.width, c.height);
                    return new Set(new Uint32Array(data.buffer)).size > 1;
                  }),
                ),
            { message: `${lib}/${kind}` },
          )
          .toBe(true);
      }
      await expect(page.locator('.card .error')).toHaveCount(0);
    }
  }
});

test('stacked bar: chart chunk loads before bench:ready, malformed JSON is rejected, nudge moves proportions', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { readyAt: number };
    window.addEventListener('message', e => {
      if (e.data?.type === 'bench:ready') w.readyAt = performance.now();
    });
  });
  await page.goto('/gallery.html?lib=recharts&chart=stacked-bar');
  await page.waitForFunction(() => (window as unknown as { readyAt?: number }).readyAt !== undefined);
  const { readyAt, chunkEnd } = await page.evaluate(() => ({
    readyAt: (window as unknown as { readyAt: number }).readyAt,
    chunkEnd: Math.max(
      ...(performance.getEntriesByType('resource') as PerformanceResourceTiming[])
        .filter(r => r.name.includes('stacked-bar'))
        .map(r => r.responseEnd),
    ),
  }));
  expect(chunkEnd).toBeGreaterThan(0);
  expect(chunkEnd).toBeLessThan(readyAt);

  const text = sample('stacked-bar', 'typical');
  expect(() => parseSeries('stacked-bar', '{')).toThrow();
  expect(() => parseSeries('stacked-bar', '{"categories":["a","b"],"series":[{"values":[1]}]}')).toThrow(
    /one number per category/,
  );
  expect(() => parseSeries('stacked-bar', '{"categories":["a"],"series":[{"values":[-1]}]}')).toThrow(
    /non-negative/,
  );
  const share = (p: Parsed) => {
    const { series } = (p as Extract<Parsed, { chart: 'stacked-bar' }>).data;
    return series[0]!.values[0]! / series.reduce((sum, s) => sum + s.values[0]!, 0);
  };
  const parsed = parseSeries('stacked-bar', text);
  expect(share(nudge(parsed))).not.toBeCloseTo(share(parsed), 2);
});

test('heatmap: non-rectangular values are rejected, nudge changes the mapped ramp position', () => {
  const heatmap = (values: string, xs = '"a","b"', ys = '"r","s"') =>
    `{"xs":[${xs}],"ys":[${ys}],"values":${values}}`;
  expect(() => parseSeries('heatmap', heatmap('[[1,2],[3]]'))).toThrow(/one number per "xs"/);
  expect(() => parseSeries('heatmap', heatmap('[[1,2]]'))).toThrow(/one row per "ys"/);
  const flat = (p: Parsed) => (p as Extract<Parsed, { chart: 'heatmap' }>).data.values.flat();
  const ramp = (p: Parsed) => {
    const v = flat(p);
    const lo = Math.min(...v);
    const hi = Math.max(...v);
    return v.map(x => (x - lo) / (hi - lo));
  };
  const abc = '"a","b","c"';
  const cases: [string, string, string][] = [
    ['[[1,2],[1,2]]', '"a","b"', '"r","s"'],
    ['[[0,5],[0,7]]', '"a","b"', '"r","s"'],
    ['[[0,0],[0,5]]', '"a","b"', '"r","s"'],
    ['[[-1,-2],[-3,-4]]', '"a","b"', '"r","s"'],
    ['[[1,2,3],[1,2,3]]', abc, '"r","s"'],
    ['[[1,2]]', '"a","b"', '"r"'],
  ];
  for (const [values, xs, ys] of cases) {
    const parsed = parseSeries('heatmap', heatmap(values, xs, ys));
    expect(ramp(nudge(parsed)), values).not.toEqual(ramp(parsed));
  }
  const constant = parseSeries('heatmap', heatmap('[[3,3],[3,3]]'));
  expect(new Set(flat(nudge(constant))).size).toBeGreaterThan(1);
  const huge = nudge(parseSeries('heatmap', heatmap('[[1e308,-1e308,1]]', abc, '"r"')));
  expect(flat(huge).every(Number.isFinite)).toBe(true);
});

test('treemap: invalid trees are rejected, parent values are ignored, nudge changes leaf shares', () => {
  const leaf = (id: string, value: unknown) => ({ id, value });
  const tree = (...children: unknown[]) => JSON.stringify({ id: 'root', children });
  expect(() => parseSeries('treemap', tree(leaf('a', 1), leaf('a', 2)))).toThrow(/Duplicate node id/);
  expect(() => parseSeries('treemap', tree(leaf('a', 0)))).toThrow(/positive/);
  expect(() => parseSeries('treemap', tree({ id: 'g', children: [] }))).toThrow(/non-empty/);
  let deep: unknown = leaf('x', 1);
  for (let i = 0; i < 20; i++) deep = { id: `n${i}`, children: [deep] };
  expect(() => parseSeries('treemap', JSON.stringify(deep))).toThrow(/Nesting/);

  const parsed = parseSeries(
    'treemap',
    tree({ id: 'g', value: 99, children: [leaf('a', 1), leaf('b', 2)] }, leaf('c', 3)),
  );
  if (parsed.chart !== 'treemap') throw new Error('wrong kind');
  expect(parsed.data.children![0]).not.toHaveProperty('value');

  const shares = (p: typeof parsed) => {
    const leaves = treeLeaves(p.data);
    const total = leaves.reduce((sum, l) => sum + l.value, 0);
    return Object.fromEntries(leaves.map(l => [l.id, l.value / total]));
  };
  const after = nudge(parsed);
  if (after.chart !== 'treemap') throw new Error('wrong kind');
  const before = shares(parsed);
  const moved = shares(after);
  expect(Object.keys(moved)).toEqual(Object.keys(before));
  expect(Object.keys(before).every(id => moved[id] !== before[id])).toBe(true);
});

test('sankey: unknown nodes and cycles are rejected, nudge changes link shares', () => {
  const graph = (links: unknown[], ids = ['a', 'b', 'c']) =>
    JSON.stringify({ nodes: ids.map(id => ({ id })), links });
  const link = (source: string, target: string, value = 1) => ({ source, target, value });
  expect(() => parseSeries('sankey', graph([link('a', 'z')]))).toThrow(/unknown node/);
  expect(() => parseSeries('sankey', graph([link('a', 'b'), link('b', 'c'), link('c', 'a')]))).toThrow(/cycle/);
  expect(() => parseSeries('sankey', graph([link('a', 'a')]))).toThrow(/itself/);

  const parsed = parseSeries('sankey', graph([link('a', 'b', 1), link('a', 'c', 2), link('b', 'c', 4)]));
  if (parsed.chart !== 'sankey') throw new Error('wrong kind');
  const after = nudge(parsed);
  if (after.chart !== 'sankey') throw new Error('wrong kind');
  const shares = (links: { value: number }[]) => {
    const total = links.reduce((sum, l) => sum + l.value, 0);
    return links.map(l => l.value / total);
  };
  const before = shares(parsed.data.links);
  const moved = shares(after.data.links);
  expect(after.data.links.map(l => [l.source, l.target])).toEqual(parsed.data.links.map(l => [l.source, l.target]));
  expect(before.every((share, i) => moved[i] !== share)).toBe(true);
});

test('box plot: statistics match a hand-computed case, parsing rejects bad groups, nudge moves every group on the axis', () => {
  expect(boxStats([1, 2, 3, 4, 5, 6, 100])).toMatchObject({
    q1: 2.5,
    median: 4,
    q3: 5.5,
    whiskerLow: 1,
    whiskerHigh: 6,
    min: 1,
    max: 100,
    outliers: [100],
  });
  expect(boxStats([7])).toMatchObject({ q1: 7, median: 7, q3: 7, whiskerLow: 7, whiskerHigh: 7 });
  expect(boxStats([0, 1, 2, 100])).toMatchObject({
    q1: 0.75,
    q3: 26.5,
    whiskerLow: 0,
    whiskerHigh: 26.5,
    outliers: [100],
  });
  expect(boxStats([-100, 0, 1, 2])).toMatchObject({
    q1: -25,
    q3: 1.25,
    whiskerLow: -25,
    whiskerHigh: 2,
    outliers: [-100],
  });

  const groups = (g: unknown[]) => JSON.stringify({ groups: g });
  expect(() => parseSeries('boxplot', groups([]))).toThrow(/groups/);
  expect(() => parseSeries('boxplot', groups([{ id: 'a', values: [] }]))).toThrow(/values/);
  expect(() => parseSeries('boxplot', groups([{ id: 'a', values: [1, null] }]))).toThrow(/number/);
  expect(() =>
    parseSeries('boxplot', groups([{ id: 'a', values: [1] }, { id: 'a', values: [2] }])),
  ).toThrow(/Duplicate/);

  const scale = boxScale(
    boxplotStats({
      groups: [
        { id: 'a', color: '#000', values: [0, 1, 2, 100] },
        { id: 'b', color: '#000', values: [0, 1, 2, 3] },
      ],
    }),
  );
  expect(scale.domain).toEqual([0, 100]);
  expect(scale.ticks).toEqual([0, 20, 40, 60, 80, 100]);

  const offset = boxScale(boxplotStats({ groups: [{ id: 'a', color: '#000', values: [1e12, 1e12 + 1] }] }));
  expect(offset.domain).toEqual([1e12, 1e12 + 1]);
  expect(offset.ticks).toEqual([1e12, 1e12 + 0.2, 1e12 + 0.4, 1e12 + 0.6, 1e12 + 0.8, 1e12 + 1]);

  const positions = (parsed: Parsed) => {
    if (parsed.chart !== 'boxplot') throw new Error('wrong kind');
    const stats = boxplotStats(parsed.data);
    const [lo, hi] = boxScale(stats).domain;
    return stats.map(s => [s.q1, s.median, s.q3, s.whiskerLow, s.whiskerHigh].map(v => (v - lo) / (hi - lo)).join());
  };
  const one = (values: number[]) => ({ id: 'a', values });
  for (const text of [
    sample('boxplot', 'typical'),
    groups([one([5, 5]), { id: 'b', values: [5, 5, 5, 5] }]),
    groups([one([1, 2, 3, 4, 5])]),
    groups([one([1, 2])]),
    groups([one([1, 1, 1, 2])]),
    groups([one([1, 2, 3, 4]), { id: 'b', values: [1, 2, 3, 4] }]),
  ]) {
    const parsed = parseSeries('boxplot', text);
    const after = nudge(parsed);
    if (parsed.chart !== 'boxplot' || after.chart !== 'boxplot') throw new Error('wrong kind');
    expect(after.data.groups.map(g => [g.id, g.values.length])).toEqual(
      parsed.data.groups.map(g => [g.id, g.values.length]),
    );
    const before = positions(parsed);
    const moved = positions(after);
    expect(before.every((p, i) => moved[i] !== p), text).toBe(true);
  }
});

test('candlestick: an impossible bar is rejected, nudge keeps low, stays valid, moves every body and flips some candles', () => {
  const bar = (b: object) =>
    JSON.stringify({ candles: [{ t: '2024-01-02', open: 5, high: 8, low: 2, close: 6, ...b }] });
  expect(() => parseSeries('candlestick', bar({ low: 5.5 }))).toThrow(/low <= open/);
  expect(() => parseSeries('candlestick', bar({ high: 5.5 }))).toThrow(/low <= open/);
  expect(() => parseSeries('candlestick', bar({ t: '2024-02-30' }))).toThrow(/YYYY-MM-DD/);
  expect(() => parseSeries('candlestick', bar({ t: '2024-13-01' }))).toThrow(/candles\[0\]\.t/);
  expect(() => parseSeries('candlestick', bar({ close: null }))).toThrow(/number/);
  expect(() => parseSeries('candlestick', bar({}))).toThrow(/two candles/);
  expect(() => parseSeries('candlestick', JSON.stringify({ candles: [] }))).toThrow(/candles/);
  const twice = JSON.stringify({ candles: [JSON.parse(bar({})).candles[0], JSON.parse(bar({})).candles[0]] });
  expect(() => parseSeries('candlestick', twice)).toThrow(/Duplicate/);

  const two = JSON.stringify({
    candles: [
      { t: '2024-01-03', open: 5, high: 8, low: 2, close: 6 },
      { t: '2024-01-02', open: 4, high: 7, low: 1, close: 4 },
    ],
  });
  const parsed = parseSeries('candlestick', two);
  if (parsed.chart !== 'candlestick') throw new Error('wrong kind');
  expect(parsed.data.candles.map(c => c.t)).toEqual(['2024-01-02', '2024-01-03']);
  const same = parseSeries(
    'candlestick',
    JSON.stringify({
      candles: ['2024-01-02', '2024-01-03'].map(t => ({ t, open: 5, high: 5, low: 5, close: 5 })),
    }),
  );
  expect(nudge(same)).not.toEqual(same);

  const body = (parsed: Parsed) => {
    if (parsed.chart !== 'candlestick') throw new Error('wrong kind');
    const { candles } = parsed.data;
    const lo = Math.min(...candles.map(c => c.low));
    const hi = Math.max(...candles.map(c => c.high));
    return candles.map(c => [(c.open - lo) / (hi - lo), (c.close - lo) / (hi - lo), c.close >= c.open].join());
  };
  for (const text of [two, sample('candlestick', 'typical')]) {
    const before = parseSeries('candlestick', text);
    const after = nudge(before);
    if (before.chart !== 'candlestick' || after.chart !== 'candlestick') throw new Error('wrong kind');
    expect(after.data.candles.map(c => c.t)).toEqual(before.data.candles.map(c => c.t));
    after.data.candles.forEach((c, i) => {
      const was = before.data.candles[i]!;
      expect(c.low).toBe(was.low);
      expect(Math.min(c.open, c.close)).toBeGreaterThanOrEqual(c.low);
      expect(Math.max(c.open, c.close)).toBeLessThanOrEqual(c.high);
    });
    const moved = body(after);
    const was = body(before);
    expect(was.every((p, i) => moved[i] !== p), text.slice(0, 40)).toBe(true);
    expect(after.data.candles.some((c, i) => c.close >= c.open !== before.data.candles[i]!.close >= before.data.candles[i]!.open)).toBe(true);
  }
});
