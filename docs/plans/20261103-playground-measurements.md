# Playground measurements: isolated runs, more metrics, proof they are right

## Overview

- The playground (`apps/bench/index.html`, what `pnpm preview` serves and GitHub Pages hosts) mounts every selected library at once in its own iframe, one run each, and shows a single "ms to paint". All same-origin iframes share one main thread and most cards are offscreen, so each number is distorted by its neighbours.
- This change measures one library at a time in a single visible "lab" frame, reloaded per run, and reports median ± IQR/2 for mount time, update time, main-thread blocking during mount, DOM nodes, bundle size, and worst frame while the visitor hovers.
- Playwright specs prove the numbers are right: the playground recovers known injected costs on every settle path, agrees with the existing harness on the same machine, and would detect interference if it were present.
- **Scope: playground only.** The Playwright benchmark (`tests/bench.spec.ts`, `bench-stage/playwright.ts`), the chart wrappers (`src/arms/*/charts.tsx`), the `Arm` contract and the committed results keep their behaviour. The new arm-page code runs only when the page is embedded and is loaded with a dynamic `import()`, so top-level arm pages (the harness) never execute it at runtime. Bundle totals grew once by ~0.9 KB (vite's preload helper in the shared arm-page chunk), accepted by the user; from then on `results/bundle.json` stays unchanged versus the committed file.

## Context (from discovery)

Brief: `docs/plans/briefs/20261103-playground-measurements.md` (local only). Plan reviewed by plan-review; findings applied.

- Playground: `apps/bench/src/playground/main.tsx:30-80` (`ArmFrame`, one iframe per lib), `:41` matches `bench:settled`, `:136-139` disclaimer, `:145-152` card list; `parse.ts` (`parseSeries`, `formatSeries`).
- Arm page: `apps/bench/src/ArmPage.tsx:15-17` message types, `:48-57` listener + observer on `bench:mount`, `:66-72` re-key per data message, `:70` auto `mount()`, `:77-80` `settled` closure inside BenchStage's render prop.
- Instrument: `packages/bench-stage/src/BenchStage.tsx:32-47` double-rAF settle, `:34-36` once-guard `requestedRef` (reset only by `startRun`, `:52-54`); `window.ts:1-16`; `stats.ts` `summarize` (browser-safe, `bench-stage/stats`).
- Harness readers that must not change: `packages/bench-stage/src/playwright.ts:28-30` (`MEASURE`, `[data-bench-stage] *`), `:35-70` `measureHover` sweeps the pointer inside the stage; `tests/bench.spec.ts:38-39` (`bench:start`, `bench:naive` via `.at(-1)` / `findLast`).
- Settle signals: chartjs `src/arms/chartjs/charts.tsx:73-87` (`done` flag never resets → `onSettled` once); react-chartjs-2 5.3.1 updates in a passive `useEffect` (`dist/index.js:125-131`); echarts `src/arms/echarts/charts.tsx:39-48` re-inits on option change and fires `finished`, effect deps include `onSettled`.
- Build: `vite.config.ts` inputs from `src/data/arms.ts`; `scripts/bundle-size.mjs:8-17` follows `imports` only (not `dynamicImports`) and rewrites tracked `results/bundle.json` on every `pnpm build`.
- Tests: Playwright only (`playwright.config.ts`: `vite preview` on 4173, `workers: 1`, viewport 1000x700, needs `pnpm build`). No unit runner. `results/run-1x.jsonl`: shell mountMs 17–23.5, `none` survival-typical domNodes 116.

## Development Approach

- **testing approach**: Regular (code first, then tests). Specs live in `apps/bench/tests/playground.spec.ts`; no unit runner is added.
- complete each task fully before moving to the next; small, focused changes.
- **CRITICAL: every task MUST include new/updated tests** for the code it changes.
- **CRITICAL: all tests must pass before starting the next task.**
- **CRITICAL: update this plan file when scope changes during implementation.**
- Backward compatibility: harness pages never execute the embedded code at runtime. Bundle totals grew once by ~0.9 KB (vite's preload helper in the shared arm-page chunk), accepted by the user; after Task 1, `git diff --exit-code results/bundle.json` must stay clean against the committed file after `pnpm build`.
- ⚠️ Deviation (Task 1): the `import()` adds vite's modulepreload helper to the shared `_ArmPage` chunk, so every arm's `totalKb` grew ~0.9 KB and chartjs `libraryKb` moved 55.5 → 55.4. The user accepted the drift; the regenerated `results/bundle.json`, `ARTICLE.md` and `results/report.md` bundle rows were updated to match.

## Testing Strategy

- **Playwright specs**: `pnpm build && pnpm -F bench exec playwright test playground`.
- **Tolerances**: the mount/update timer ends on a frame boundary but starts mid-frame, so each median carries up to one frame of phase error and a difference of two medians up to two. Specs measure the frame period `F` in-page (median rAF gap) instead of hard-coding 16.7 ms. Known-cost: assert absolute medians, not only Δ — the cost swallows the baseline's frame wait, so `loaded ≥ cost`, `loaded ≤ cost + 2F`, `F/2 < base ≤ 2F + 5 ms` (update baselines observed 13–19 ms at F=16.7; a missing rAF would sit near F/2; the signal arm adds its fixed 50 ms wait to every bound) (Δ lies in `[cost − 2F, cost + F]`). Agreement: `|Δ| ≤ 2F`.
- **Benchmark regression gate** (every task touching arm pages): `BENCH_REPEATS=1 BENCH_ARMS=none,echarts,chartjs BENCH_OUT=<scratch>/gate.jsonl pnpm -F bench exec playwright test bench` passes with the same JSON keys, and `git diff --exit-code apps/bench/results/bundle.json` after `pnpm build` (clean against the file committed in Task 1).
- `pnpm typecheck` after every task.
- Not in CI: timing specs on shared runners are flaky; CI keeps typecheck + build.

## Progress Tracking

- mark completed items with `[x]` immediately when done
- add newly discovered tasks with ➕ prefix
- document issues/blockers with ⚠️ prefix
- keep plan in sync with actual work done

## Solution Overview

**Old mechanism replaced:** N concurrent iframes, one run each, timed by whichever `bench:mount` measure arrives → one lab iframe, one library at a time, a fresh page load per run (the harness's own method), results tagged with a run id.

```
playground ── for each selected library (sequential, controls disabled):
   lab iframe <lib>.html?embed=lab ──ready──▶ {runId, mode:'mount', data}
                                    ◀── result{runId, mountMs, blockingMs, domNodes}
                                    ──▶ {runId, mode:'update', data'}      (same page, no reload)
                                    ◀── result{runId, updateMs}
   reload lab, repeat: 1 warm-up (discarded) + 5 measured → summarize()
 then: lab removed; display cards <lib>.html?embed=display (untimed) + hover max-frame on visitor hover
```

Key decisions:

- **Split the arm page.** `mountArm` renders today's `ArmPage` for top-level pages, minus the postMessage code added with the first playground (it moves out). When `window.parent !== window`, it `import()`s `EmbeddedArmPage.tsx` instead, which holds the protocol, the update path, LoAF and hover instrumentation. The harness never loads that chunk; `bundle-size.mjs` does not count dynamic imports.
- **Isolation**: only one playground-owned frame exists while measuring; display cards are created after the lab is removed. The lab sits in a fixed full-size overlay (no CSS scaling, which would change paint cost) so it is always on screen and never rAF-throttled. Controls are disabled while measuring; the overlay has a Cancel button.
- **Hidden tab**: a `visibilitychange` to hidden cancels the current run at once; the lab waits for visible and repeats it. The 60 s per-run timeout only counts while visible.
- **Floor**: the lab measures `shell` once per session and shows it as the instrument floor (60 Hz vs 120 Hz displays differ).
- **Mount**: unchanged mechanism — re-key `BenchStage`, `mount()`, `bench:mount` measure (same double rAF as the harness).
- **Update**: the embedded page sets new data of the same shape without re-keying, marks `play:update-start`, and owns its own settle — it never calls BenchStage's once-guarded `requestSettle`. Both modes end in the same double rAF as mount, then `performance.measure('play:update', …)`:
  - `raf`: double rAF requested from a passive `useEffect([payload])` in the embedded page. Child passive effects run first, so this lands after effect-time drawing such as react-chartjs-2's `chart.update()`.
  - `signal`: the next `settled` call from the arm (echarts re-inits on the new option and fires `finished`).
  - Per library: `arm.settleMode`, except chartjs uses `raf` on update because its `done` flag never resets. That one exception is named in the playground's library table and sent in the message.
- **Main-thread blocking**: `PerformanceObserver({type:'long-animation-frame', buffered:true})` installed at embedded-page load if `PerformanceObserver.supportedEntryTypes` has it, else `n/a`. After settle, wait one rAF + `setTimeout(0)` so late entries arrive, `takeRecords()`, and sum `blockingDuration` of frames overlapping [`bench:start`, `bench:settled`] (a frame that began before start but contains the render counts). No `longtask` fallback: browsers without LoAF lack it too.
- **Hover**: Event Timing skips `pointermove`/`mousemove`, so it would miss canvas tooltips. Use the harness's metric instead: worst rAF frame gap while the visitor's pointer is in the stage, only in `?embed=display` frames, reset on `pointerleave` and `visibilitychange`, first gap after entering discarded (same rule as `measureHover`). Display cards render at the arm's native 900×600 inside a scroll box, never scaled.
- **Bundle size**: `import bundle from '../../results/bundle.json'` in the playground — the committed, published numbers, inlined at build. No fetch, no `dist` copy.
- **Known-cost page**: test-only `calibrate.html` (a vite input outside `ARMS`; `bundle-size.mjs` keeps only `ARMS` entries). URL params: `cost` (busy-wait in render), `hoverCost` (per `pointermove`), `drawIn=effect` (busy-wait `cost` in a passive effect on every data change instead of render), `settle=signal` (`settleMode: 'signal'`, calls `onSettled` from a `setTimeout` after busy-waiting `cost`), `throw=1` (throws in render). `?libs=calibrate` in the playground selects it (never shown in the checkbox list) and extra params pass through to the lab frame src.
- **Message names**: new perf names `play:update-start` / `play:update`; `bench:start`, `bench:naive`, `bench:mount` keep their meaning. Updates add `bench:naive` marks only in embedded pages, which the harness never loads.

## Technical Details

Messages (exported from `EmbeddedArmPage.tsx`):

```ts
type DataMessage = {
  type: 'bench:data';
  runId: number;
  mode: 'mount' | 'update';
  updateSettle: 'raf' | 'signal';
} & Payload;
type ResultMessage =
  | { type: 'bench:ready' }
  | {
      type: 'bench:result';
      runId: number;
      mode: 'mount';
      mountMs: number;
      blockingMs: number | null;
      domNodes: number;
    }
  | { type: 'bench:result'; runId: number; mode: 'update'; updateMs: number }
  | { type: 'bench:hover'; maxFrameMs: number }
  | { type: 'bench:error'; runId: number | null; message: string };
```

The embedded page keeps the current `runId` in a ref so `window` `error` events can be tagged. The lab ignores any result whose `runId` is not the one in flight.

Playground result per library: `{ mount, update, blocking: Summary | null, domNodes: number, bundleKb: number | null, hoverMaxFrameMs: number | null }`, `Summary = ReturnType<typeof summarize>`.

Update data: `nudge(parsed)` copies the series with `y` changed (survival: `y`, `lower`, `upper` × 0.97; scatter: `y + 1`), same ids and point counts, so SVG libraries reconcile instead of remounting.

Runs: 1 warm-up + 5 measured per library (constants in `lab.ts`). Display: `median ± IQR/2`; values within `2F` of the shell floor greyed.

## What Goes Where

- **Implementation Steps**: code in `apps/bench`, Playwright specs, README/ARTICLE updates. `packages/bench-stage` is not modified.
- **Post-Completion**: checking the deployed Pages build in Chrome, Safari and Firefox.

## Implementation Steps

### Task 1: Embedded arm page with run-id protocol, mount metrics and update path

**Files:**

- Create: `apps/bench/src/EmbeddedArmPage.tsx`
- Modify: `apps/bench/src/ArmPage.tsx`, `apps/bench/src/playground/main.tsx`
- Create: `apps/bench/tests/playground.spec.ts`

- [x] `mountArm`: top-level → `ArmPage` with the postMessage/observer code removed (back to the pre-playground shape); embedded → `import('./EmbeddedArmPage')`
- [x] `EmbeddedArmPage`: `bench:ready`, mount mode (re-key + `mount()`, report `mountMs`, `domNodes` via `[data-bench-stage] *`, `blockingMs` per Solution Overview), update mode with its own settle (passive-effect double rAF or next `settled`, then double rAF), `settled` passed to arms held in a ref so re-renders do not re-init echarts, `runId` in a ref, `bench:error`
- [x] switch `ArmFrame` in `main.tsx` to `bench:result` (mount mode, `runId` from a counter) so the current playground keeps working until Task 3 replaces it
- [x] write spec: a top-level `none.html` never requests the embedded chunk (no resource entry matching `EmbeddedArmPage`) and `measureMount` still works
- [x] write spec: open `index.html`, inject an iframe to `none.html`, post mount then update for survival-typical; both results carry the sent `runId`; `domNodes` equals the harness `measureMount` value for the same case; `updateMs` finite and > 0
- [ ] run regression gate (incl. `git diff --exit-code results/bundle.json`) + `pnpm typecheck` + specs — must pass before Task 2

### Task 2: Test-only known-cost page

**Files:**

- Create: `apps/bench/calibrate.html`, `apps/bench/src/arms/calibrate/main.tsx`, `apps/bench/src/arms/calibrate/charts.tsx`
- Modify: `apps/bench/vite.config.ts`, `apps/bench/scripts/bundle-size.mjs`, `apps/bench/tests/playground.spec.ts`

- [x] calibrate arm with `cost`, `hoverCost`, `drawIn=effect`, `settle=signal`, `throw=1` (see Solution Overview); empty stage otherwise
- [x] add `calibrate.html` as a vite input outside `ARMS`; `bundle-size.mjs` keeps only `ARMS` entries; build and confirm `git diff --exit-code results/bundle.json` (unchanged versus the committed file after Task 1)
- [x] write spec: harness `measureMount` on `calibrate.html?cost=0` vs `?cost=100`, 5 runs each → `base`/`loaded` absolute bounds (see Testing Strategy)
- [x] write spec: embedded update Δ (cost 0 vs 100) within the same absolute bounds for each of: default (`raf`, render), `drawIn=effect`, `settle=signal`
- [x] write spec: embedded `throw=1` → `bench:error` carrying the run id of the mount that threw
- [ ] run regression gate + specs — must pass before Task 3
- ⚠️ Deviation: measured Δ is below `cost − F` (observed `cost − 1.4F`…`cost − 2F`): a blocked main thread makes both rAFs fire right after the busy-wait (loaded ≈ cost + ~1 ms) while the zero-cost baseline waits ~1.5F. Specs assert absolute `loaded`/`base` bounds instead of Δ (review 2.1.1).

### Task 3: Sequential lab runner

**Files:**

- Create: `apps/bench/src/playground/lab.ts`
- Modify: `apps/bench/src/playground/main.tsx`, `apps/bench/src/playground/parse.ts` (add `nudge`), `apps/bench/src/playground/style.css`, `apps/bench/tests/playground.spec.ts`

- [ ] `measureLibrary(frame, library, data, { runs, warmup, query })`: per run reload `frame.src` (`?embed=lab` + passthrough params), await ready, mount, update; drop results with a stale `runId`; cancel and repeat on hidden; 60 s timeout counted while visible
- [ ] `measureAll(libraries, data)`: shell floor once, then each library in turn; progress callback; Cancel stops after the current message
- [ ] lab overlay (fixed, native size, `data-lab`), controls disabled while measuring, removed when done
- [ ] `?libs=` preselects libraries and accepts `calibrate` (hidden from the list); other query params pass through to the lab src
- [ ] write spec: playground `?libs=calibrate&cost=0` vs `cost=100` → mount `base`/`loaded` within known-cost bounds; `cost=150` → blocking median ≥ 80 ms where LoAF is supported
- [ ] write spec: polling during a run, at most one of `[data-lab] iframe, .card iframe` exists
- [ ] write spec: a result posted with the previous `runId` after a new run started is ignored (inject via `page.evaluate` on the lab frame)
- [ ] write spec: override `document.visibilityState` to `hidden` via `Object.defineProperty` in the parent and dispatch `visibilitychange` mid-run, restore, → run repeated, final sample count still 5
- [ ] run tests — must pass before Task 4

### Task 4: Results table, bundle size and display cards

**Files:**

- Modify: `apps/bench/src/playground/main.tsx`, `apps/bench/src/playground/style.css`, `apps/bench/tests/playground.spec.ts`

- [ ] results table: library, mount, update, blocking, DOM nodes, bundle (library KB from `results/bundle.json` import), hover; median ± IQR/2; shell floor row; `n/a` where an API is missing
- [ ] display cards (`?embed=display`, native 900×600 in a scroll box) created after the lab is removed; replace the "single run, side by side" disclaimer with one line on the method and "comparable within this session only"
- [ ] write spec (happy path): `?libs=none,recharts`, Render → two rows with finite mount/update, bundle KB matching `results/bundle.json`, then two display cards
- [ ] write spec: invalid JSON shows the parse error and starts no measurement (no `[data-lab]`)
- [ ] run tests — must pass before Task 5

### Task 5: Hover max frame on display cards

**Files:**

- Modify: `apps/bench/src/EmbeddedArmPage.tsx`, `apps/bench/src/playground/main.tsx`, `apps/bench/tests/playground.spec.ts`

- [ ] in `?embed=display` pages only: rAF loop while the pointer is in the stage, worst gap (first discarded) posted as `bench:hover`; reset on `pointerleave` and `visibilitychange`
- [ ] hover column fills in once the visitor has hovered that library's card
- [ ] write spec: `calibrate?hoverCost=100`, `page.mouse` sweep over the display card → hover ≥ 100 ms; `hoverCost=0` → ≤ 2F
- [ ] write spec: lab frames (`embed=lab`) never post `bench:hover`
- [ ] run tests — must pass before Task 6

### Task 6: Validation — harness agreement and interference sensitivity

**Files:**

- Modify: `apps/bench/tests/playground.spec.ts`

- [ ] agreement: `none` and `recharts`, survival-typical sample: harness `measureMount` × 5 on the top-level page vs playground lab × 5 → `|Δ| ≤ 2F` for mount, and domNodes equal
- [ ] sensitivity (negative control): run the lab on `none` while the spec injects three neighbour iframes of `calibrate.html?cost=40` that re-mount in a loop → median shifts by more than `2F`. This proves the agreement check would catch interference, so its passing means the isolation holds
- [ ] run tests — must pass before Task 7

### Task 7: Verify acceptance criteria

- [ ] every metric from the Overview shows for all seven libraries on both charts and both sample sizes
- [ ] `pnpm typecheck` and `pnpm build` pass; `git diff --exit-code apps/bench/results/` clean (against the files committed after Task 1)
- [ ] `pnpm -F bench exec playwright test playground` passes
- [ ] benchmark regression gate passes
- [ ] check the playground in a real browser (agent-browser): measure → table → cards → hover → paste own data → re-measure

### Task 8: [Final] Update documentation

**Files:**

- Modify: `README.md`, `ARTICLE.md`

- [ ] README "Playground": method (sequential lab, 1 + 5 runs, median), metrics, how to run the specs
- [ ] `ARTICLE.md:178` — the playground now exists; link it
- [ ] move this plan to `docs/plans/completed/`

## Post-Completion

**Manual verification**

- open the deployed Pages build in Chrome, Safari and Firefox: blocking shows `n/a` where LoAF is missing, everything else works
- switch tabs mid-measurement and confirm the run is repeated, not recorded

**Known limits stated on the page**

- numbers are for this visitor's machine and comparable within one session only
- 120 Hz displays get a lower floor; the `shell` row shows it
