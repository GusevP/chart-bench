import { expect, test } from '@playwright/test';
import { measureMount } from 'bench-stage/playwright';

import { DATASETS, generateSurvival } from '../src/data/generate';

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

  await page.goto('/index.html');
  const series = generateSurvival(DATASETS.survival.typical);
  type Result = {
    type: string;
    runId?: number;
    mode?: string;
    mountMs?: number;
    domNodes?: number;
    updateMs?: number;
  };
  const results = await page.evaluate(
    async ({ series }) => {
      const frame = document.createElement('iframe');
      document.body.append(frame);
      const inbox: Result[] = [];
      const next = (pred: (m: Result) => boolean) =>
        new Promise<Result>(resolve => {
          const hit = inbox.find(pred);
          if (hit) return resolve(hit);
          const on = (e: MessageEvent<Result>) => {
            if (e.source !== frame.contentWindow) return;
            inbox.push(e.data);
            if (pred(e.data)) {
              window.removeEventListener('message', on);
              resolve(e.data);
            }
          };
          window.addEventListener('message', on);
        });
      const ready = next(m => m.type === 'bench:ready');
      frame.src = '/none.html?embed=lab';
      await ready;
      const send = (runId: number, mode: string, series: unknown) =>
        frame.contentWindow!.postMessage(
          { type: 'bench:data', runId, mode, updateSettle: 'raf', chart: 'survival', series },
          location.origin,
        );
      send(11, 'mount', series);
      const mount = await next(m => m.type === 'bench:result' && m.mode === 'mount');
      const nudged = (series as { points: { y: number; lower: number; upper: number }[] }[]).map(s => ({
        ...s,
        points: s.points.map(p => ({ ...p, y: p.y * 0.97, lower: p.lower * 0.97, upper: p.upper * 0.97 })),
      }));
      send(12, 'update', nudged);
      const update = await next(m => m.type === 'bench:result' && m.mode === 'update');
      return { mount, update };
    },
    { series },
  );

  expect(results.mount.runId).toBe(11);
  expect(results.update.runId).toBe(12);
  expect(results.mount.domNodes).toBe(harness.domNodes);
  expect(results.mount.mountMs).toBeGreaterThan(0);
  expect(Number.isFinite(results.update.updateMs)).toBe(true);
  expect(results.update.updateMs).toBeGreaterThan(0);
});
