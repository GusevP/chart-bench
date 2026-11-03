import type { Page } from '@playwright/test';

import { MEASURE } from './window';
import type { BenchWindow } from './window';

export type MountSample = {
  mountMs: number;
  domNodes: number;
};

export async function measureMount(page: Page, { remount = false } = {}): Promise<MountSample> {
  await page.waitForFunction(() => (window as BenchWindow).benchStageReady === true);
  await page.evaluate(again => {
    const api = (window as BenchWindow).benchStage!;
    if (again) api.remount();
    else api.mount();
  }, remount);
  await page.waitForFunction(() => (window as BenchWindow).benchStageSettled === true, undefined, {
    timeout: 60_000,
  });
  return page.evaluate(name => {
    const entry = performance.getEntriesByName(name, 'measure').at(-1);
    const stage = document.querySelector('[data-bench-stage]');
    return {
      mountMs: entry?.duration ?? Number.NaN,
      domNodes: stage ? stage.querySelectorAll('*').length : 0,
    };
  }, MEASURE);
}

/**
 * Sweeps the pointer across the stage and returns the longest gap between animation frames.
 * Frame gaps are quantised to the display refresh, so only differences of a whole frame mean anything.
 */
export async function measureHover(page: Page, { steps = 60 } = {}): Promise<{ maxFrameMs: number }> {
  const box = await page.locator('[data-bench-stage]').boundingBox();
  if (!box) throw new Error('bench stage not found');

  await page.evaluate(() => {
    const w = window as BenchWindow & {
      __frames?: number[];
      __stopFrames?: boolean;
    };
    w.__frames = [];
    w.__stopFrames = false;
    let last = performance.now();
    const tick = (now: number) => {
      w.__frames!.push(now - last);
      last = now;
      if (!w.__stopFrames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const y = box.y + box.height / 2;
  for (let i = 0; i <= steps; i++) {
    await page.mouse.move(box.x + (box.width * i) / steps, y + Math.sin(i / 4) * box.height * 0.3);
  }

  return page.evaluate(() => {
    const w = window as BenchWindow & {
      __frames?: number[];
      __stopFrames?: boolean;
    };
    w.__stopFrames = true;
    // The first entry spans from setup to the first frame, not a rendered frame.
    const frames = w.__frames!.slice(1);
    return { maxFrameMs: frames.length ? Math.max(...frames) : Number.NaN };
  });
}
