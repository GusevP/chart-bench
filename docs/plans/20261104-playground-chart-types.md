# Playground: ten more chart types

## Overview
- Add ten chart types to the playground, beside Survival and Scatter: stacked bar, stacked area, donut, radar, bar + line on two axes, heatmap, treemap, sankey, box plot, candlestick.
- Each library renders a type from the same pasted JSON, with the same measurements as today. A library that has no such chart shows a "Not supported" card, because that is a finding for someone choosing a library.
- Playground only: the benchmark harness, `results/bundle.json` numbers, `tests/bench.spec.ts` and the Survival/Scatter wrappers keep their behaviour.

## Context (from discovery)
- `apps/bench/src/ArmPage.tsx`, `EmbeddedArmPage.tsx`: arm page and embedded protocol, `Payload`, `fromUrl`.
- `apps/bench/src/data/contract.ts`, `generate.ts` (`DATASETS`, `ChartKind`), `spec.ts`.
- `apps/bench/src/playground/`: `main.tsx`, `lab.ts`, `parse.ts` (`parseSeries`, `formatSeries`, `nudge`).
- `apps/bench/scripts/bundle-size.mjs`, `vite.config.ts`, `.github/workflows/pages.yml`.
- `apps/bench/tests/playground.spec.ts`: the 24 existing specs.

## Development Approach
- **testing approach**: Regular, as in `docs/plans/completed/20261103-playground-measurements.md`.
- Run each suite once. No test-of-test work and no per-type copies of the lab, calibration or agreement specs: those cover the shared runner, and every type goes through it.
- Each task leaves the app working. Update this plan if scope changes.

## Validation Commands
Per task:
- `pnpm typecheck`
- `pnpm build`
- `git diff --exit-code apps/bench/results/bundle.json` (from the commit after Task 1 regenerates it)
- `pnpm -F bench exec playwright test tests/playground.spec.ts`

In Task 1, which changes `ArmPage.tsx`, and again in the last code task's gate:
- `BENCH_ARMS=none,recharts BENCH_REPEATS=1 BENCH_OUT=$(mktemp) pnpm -F bench bench`. A pass is the check. Never write to the local `results/raw.jsonl`.

## Solution Overview

### What "supported" means
A library supports a type when one of these holds:
- it ships a component or series for it;
- a published package or plugin provides it;
- for the composition libraries (visx, TanStack), its own components or marks draw the geometry, and for TanStack its docs catalog the chart.

Writing our own path, cell or custom-shape code means Not supported. So Recharts' custom `Bar` shape for candlesticks and a nivo custom layer for bar + line do not count.

| Type | Recharts | nivo | ECharts | Chart.js | visx | TanStack |
| --- | --- | --- | --- | --- | --- | --- |
| Stacked bar | yes | `@nivo/bar` | yes | yes | `BarStack` | yes |
| Stacked area | yes | `@nivo/line` (stacked) | yes | yes | `AreaStack` | yes |
| Donut | yes | `@nivo/pie` | yes | yes | `Pie` | `polar` |
| Radar | yes | `@nivo/radar` | yes | yes | `LineRadial` | `polar` |
| Bar + line, two axes | yes | no | yes | yes | shape + two scales | yes |
| Heatmap | no | `@nivo/heatmap` | yes | `chartjs-chart-matrix` | `@visx/heatmap` | yes |
| Treemap | yes | `@nivo/treemap` | yes | `chartjs-chart-treemap` | `@visx/hierarchy` | yes |
| Sankey | yes | `@nivo/sankey` | yes | `chartjs-chart-sankey` | `@visx/sankey` | yes |
| Box plot | no | `@nivo/boxplot` | yes | `@sgratzl/chartjs-chart-boxplot` | `@visx/stats` | yes |
| Candlestick | no | no | yes | `chartjs-chart-financial` | no | catalog example |

This corrects the first table shown to the user: visx `BarStack`, `AreaStack`, `Pie`, `LineRadial` and `@visx/stats`, and TanStack candlestick, exist. `none` stays at two types and is Not supported for all ten. Implementers do not change a cell on their own. If a cell turns out false, record a `[deviation]` and leave the type unsupported.

Treemap: leaf areas match in all six, but Chart.js tiles with squarify ratio 1 and has no option to change it, while the other five default to the golden ratio, so its rectangles land in different places. Chart.js is the one recorded outlier; the other libraries are not aligned.

`chartjs-chart-financial` 0.2.1 is pre-1.0 and `chartjs-chart-sankey` is 0.x; if either fails on Chart.js 4.6, that cell becomes `no` with a deviation.

### Separate build
New wrappers must not share a Rollup graph with the arm pages. Rollup keeps a module in one chunk, so an export used only by a lazy chart would land in the arm's chunk and grow `bundle.json` and the harness page. A second Vite build (`vite.gallery.config.ts`, same root, `base: './'`, `plugins: [react()]`, no manifest, no `mergeConfig` with `vite.config.ts`) has one entry, `gallery.html`, and writes to `dist/`. This replaces the lazy-`more`-on-each-arm idea.

The same trap applies to data: `generate.ts` sits in the chunk every arm loads, so it stays byte-identical. New generators and datasets go in `src/data/gallery-samples.ts`, imported only from `src/playground/`, reusing `prng` and `PALETTE`.

- One file per supported pair: `apps/bench/src/arms/<lib>/gallery/<type>.tsx`, default export `{ settleMode, Chart }`. No file means not supported, so the matrix has one source of truth. Per-library helpers go in `arms/<lib>/shared/`, outside the glob. `EChart` and `useSettlePlugin` are copied there, not moved out of `charts.tsx`, because importing that file drags in its registrations.
- `gallery.html?lib=<lib>&chart=<type>` finds the module with `import.meta.glob('./arms/*/gallery/*.tsx')`, loads it, then calls the shared embedded mount.
- `scripts/gallery-bundle.mjs` writes committed `results/gallery-bundle.json`: `{ [lib]: { [type]: { libraryKb } } }`. Sizes cannot come from the gallery build: `chart.js`, `@nivo/core` and others are single modules, so a shared graph would charge every type for the union of all types. Instead it runs one in-memory Vite build (`configFile: false`, `write: false`, React plugin, exactly one input, since Vite would otherwise load `vite.config.ts` and merge its inputs) per pair, whose entry is a stub that mounts only that wrapper with `react-dom/client`, gzips the output JS and CSS, and subtracts the same stub built without a wrapper.
- Build order: `rm -rf dist`, `gallery-bundle.mjs`, gallery build, main build, `bundle-size.mjs`, with `emptyOutDir: false` in both configs. The index page imports the JSON at build time, so it has to be fresh first.
- The playground imports that JSON for both the KB shown and the support check. It never imports the glob, so the index page stays free of chart code.

## Technical Details

### Data shapes (`contract.ts`)
```ts
// New kinds travel as { chart: K; data: Shapes[K] }; survival and scatter stay { chart, series }.
// One exported union replaces the duplicate Payload and Parsed. Wrapper props: ChartSize & { data; onSettled }.
type CategorySeries = { id: string; color: string; values: number[] };
type Categories = { categories: string[]; series: CategorySeries[] };   // stacked-bar, stacked-area, radar
type Combo = { categories: string[]; bars: CategorySeries; line: CategorySeries }; // line on the right axis
type Donut = { slices: { id: string; color: string; value: number }[] };
type Heatmap = { xs: string[]; ys: string[]; values: number[][] };      // values[y][x]
type TreeNode = { id: string; value?: number; children?: TreeNode[] };  // treemap; leaves carry value
type Sankey = { nodes: { id: string }[]; links: { source: string; target: string; value: number }[] };
type BoxGroups = { groups: { id: string; color: string; values: number[] }[] }; // raw values
type Candles = { candles: { t: string; open: number; high: number; low: number; close: number }[] };
```
Parsers require `values.length === categories.length` and non-negative values for stacked and donut types. Heatmap and treemap share one colour ramp in `apps/bench/src/arms/shared/colorRamp.ts` (not `spec.ts`, which arm pages import). Candle `t` is an ISO date, `YYYY-MM-DD`.

Box plot statistics come from one shared helper (quartiles, Tukey whiskers), for libraries that take computed stats, so a library's own quantile method does not change the picture where we control it.

### Samples (`DATASETS`, seeded)
| Type | typical | heavy |
| --- | --- | --- |
| stacked-bar | 12 × 3 | 200 × 6 |
| stacked-area | 50 × 4 | 1000 × 8 |
| donut | 6 | 60 |
| radar | 6 axes × 3 | 24 × 8 |
| combo | 24 | 500 |
| heatmap | 20 × 20 | 100 × 100 |
| treemap | 50 leaves | 5000 leaves |
| sankey | 12 nodes, 20 links | 150 nodes, 500 links |
| boxplot | 8 groups × 200 | 40 × 2500 |
| candlestick | 250 | 5000 |

### Measurement invariants
- The chart module is loaded before the embedded page posts `bench:ready`, so mount time excludes chunk fetch and parse. Acceptance in Task 1.
- Animations off, as in the Survival/Scatter wrappers. A library that cannot turn one off gets a `[deviation]`.
- `settleMode` comes from the chart module, so ECharts stays `signal` and the rest stay as their arm. `nudge` keeps ids and shape, so update reconciles rather than remounts, and it must change rendered geometry. A uniform scale leaves donut, treemap and sankey proportions as they were, so alternating elements move in opposite directions.
- `MARGIN`, 900 × 600 and hover tracking are shared with the existing types.
- `shell` always loads its own page, whatever the chart: it is the floor, ignores its props and reads `bundle.json`. Only frame `src` depends on the chart kind. `calibrate` keys its cost on `series`, so it stays on Survival and Scatter: it is absent from `gallery-bundle.json` and shows Not supported for new kinds.
- `bundle.json`: `EmbeddedArmPage` changes may shift totals by a byte through chunk hashes. This one-time tolerance is the only exception to unchanged numbers. Regenerate `bundle.json` once in Task 1 and hand-edit any moved bundle row in `report.md` (`pnpm report` writes `raw.md`, not that file), require `libraryKb` within 0.1 of the committed values, and use exact `git diff --exit-code` afterwards. Task 2 also regenerated it once (nivo `totalKb` 172 to 172.1, `libraryKb` unchanged, shared `ArmPage` code grew by bytes).

## What Goes Where
- **Implementation Steps**: code, tests and docs in this repo.
- **Post-Completion**: adding a git remote and pushing.

## Implementation Steps

### Task 1: Gallery build and embedded plumbing, with no new visible type

**Files:**
- Create: `apps/bench/gallery.html`, `apps/bench/vite.gallery.config.ts`, `apps/bench/src/gallery.tsx`, `apps/bench/scripts/gallery-bundle.mjs`, `apps/bench/results/gallery-bundle.json`
- Modify: `apps/bench/src/EmbeddedArmPage.tsx`, `apps/bench/src/ArmPage.tsx`, `apps/bench/vite.config.ts`, `apps/bench/package.json`, `apps/bench/tests/playground.spec.ts`

- [x] make the embedded mount take a render function instead of an `Arm`, with Survival/Scatter behaviour unchanged
- [x] add `vite.gallery.config.ts` and `gallery.html`; `build` follows the build order above
- [x] `gallery.tsx` awaits `arms/<lib>/gallery/<type>.tsx` before mounting, and posts `bench:error` with `runId: null` for an unknown pair, a failed import or a throw during module evaluation
- [x] regenerate `bundle.json` once, with `libraryKb` within 0.1 of the committed values
- [x] spec: `gallery.html` for an unknown pair reports `bench:error`; `dist` holds both builds
- [ ] run the per-task gate and the harness command

### Task 2: Playground chart picker over all kinds

**Files:**
- Create: `apps/bench/src/data/gallery-samples.ts`
- Modify: `apps/bench/src/data/contract.ts`, `apps/bench/src/ArmPage.tsx`, `apps/bench/src/playground/parse.ts`, `apps/bench/src/playground/lab.ts`, `apps/bench/src/playground/main.tsx`, `apps/bench/src/playground/style.css`, `apps/bench/tests/playground.spec.ts`

- [x] make `ChartKind`, `Parsed`, `parseSeries`, `formatSeries`, `nudge` and `sample` table-driven per kind, one entry per kind, with Survival and Scatter moved onto it unchanged
- [x] add the `{ chart, data }` envelope; `ChartKind` is the old key type plus the new kinds; drop the `payload.data` cast in `gallery.tsx` once `Payload` carries `data`
- [x] lab and display frames use `gallery.html?lib=&chart=` for gallery kinds and `<lib>.html` otherwise, except `shell`
- [x] cards show `libraryKb` from `gallery-bundle.json` for gallery kinds; a pair absent from it renders a Not supported card, runs no lab and has no table row values. Selected and measured stay two lists, and nothing starts when nothing is measurable
- [x] chart picker lists all kinds; a kind is reachable only once it has a table entry
- [x] add one spec that first compares the pairs in `gallery-bundle.json` to a literal expected list in the spec, then iterates them with the typical sample, asserting stats and no `bench:error`, and every other pair shows Not supported. Each type's task adds its pairs to that list from the matrix, so an omitted wrapper fails instead of reading as unsupported. Runtime lookups still use the JSON
- [x] existing 24 specs pass unchanged
- [ ] run the per-task gate

### Task 3: Stacked bar
**Files:** `apps/bench/src/arms/{recharts,nivo,echarts,chartjs,visx,tanstack}/gallery/stacked-bar.tsx`, data and spec files from Task 2, `apps/bench/package.json`, `apps/bench/results/gallery-bundle.json`

- [x] add the `Categories` shape, sample, parser entry and `nudge`
- [x] add the wrappers from the matrix, installing `@nivo/bar`
- [x] spec: the chart chunk's `responseEnd` comes before `bench:ready` arrives; malformed JSON is rejected; `nudge` changes proportions
- [ ] run the per-task gate

### Task 4: Stacked area
- [x] sample, parser entry, `nudge`, wrappers per the matrix
- [ ] run the per-task gate

### Task 5: Donut
- [x] `Donut` shape, sample, parser entry, `nudge`, wrappers per the matrix, installing `@nivo/pie`
- [ ] run the per-task gate

### Task 6: Radar
- [x] sample, parser entry, `nudge`, wrappers per the matrix, installing `@nivo/radar`
- [ ] run the per-task gate

### Task 7: Bar + line on two axes
- [x] `Combo` shape, sample, parser entry, `nudge`, wrappers per the matrix
- [x] settle the TanStack cell: yes only if it has a second y scale without custom marks, and update the matrix
- [ ] run the per-task gate

### Task 8: Heatmap
- [x] `Heatmap` shape, sample, parser entry (rectangular `values`), `nudge`, wrappers per the matrix, installing `@nivo/heatmap`, `chartjs-chart-matrix`, `@visx/heatmap`
- [x] spec: a non-rectangular `values` rejected
- [ ] run the per-task gate

### Task 9: Treemap
- [x] `TreeNode` shape, sample, parser entry (leaves need a positive `value`), `nudge`, wrappers per the matrix, installing `@nivo/treemap`, `chartjs-chart-treemap`, `@visx/hierarchy`
- [ ] run the per-task gate

### Task 10: Sankey
- [ ] `Sankey` shape, sample, parser entry (links name known nodes, no cycles), `nudge`, wrappers per the matrix, installing `@nivo/sankey`, `chartjs-chart-sankey`, `@visx/sankey`
- [ ] spec: a link to an unknown node and a cycle rejected
- [ ] run the per-task gate

### Task 11: Box plot
- [ ] `BoxGroups` shape, shared statistics helper, sample, parser entry, `nudge`, wrappers per the matrix, installing `@nivo/boxplot`, `@sgratzl/chartjs-chart-boxplot`, `@visx/stats`
- [ ] spec: the helper against a hand-computed quartile case
- [ ] run the per-task gate

### Task 12: Candlestick
- [ ] `Candles` shape, sample, parser entry (low ≤ open, close ≤ high), `nudge`, wrappers per the matrix, installing `chartjs-chart-financial`, `chartjs-adapter-luxon` and `luxon` (its documented setup, so they count toward KB)
- [ ] spec: an impossible bar rejected
- [ ] run the per-task gate and the harness command

### Task 13: Verify acceptance criteria
- [ ] `pnpm typecheck` and `pnpm build` pass
- [ ] `pnpm -F bench exec playwright test tests/playground.spec.ts` passes
- [ ] open every type in a real browser with `agent-browser` at both sample sizes, and compare the cards by eye for the same data, legend and axes
- [ ] record in the plan any library that cannot finish a heavy sample

### Task 14: [Final] Update documentation
- [ ] update the Playground section of `README.md`: chart types, the support rule, the matrix, how to paste each shape, and the Chart.js treemap ratio-1 outlier
- [ ] add the support matrix to `ARTICLE.md` only if it already discusses chart coverage
- [ ] move this plan to `docs/plans/completed/`

## Post-Completion
*Items requiring manual intervention or external systems. No checkboxes, informational only.*

- This repo has no git remote yet. GitHub Pages deploys after one is added and `main` is pushed.
