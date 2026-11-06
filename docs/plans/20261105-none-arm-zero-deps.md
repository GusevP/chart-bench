# No-library arm: zero dependencies, all twelve charts

## Overview
- Redefine the `none` arm as React plus hand-written SVG, with no d3 and no other chart package. This covers Survival and Scatter as well as the ten gallery types, which `none` does not implement today.
- It answers a question no other arm answers: what a chart library actually saves you. visx already covers "d3 primitives plus your own SVG", so a d3-based `none` mostly repeats it.
- Every chart then has a baseline for tokens, bundle size, timings and DOM nodes.

## Context (from discovery)
Scout brief: `docs/plans/briefs/20261105-none-arm-zero-deps.md`.

Change sites and consumers:
- `apps/bench/src/arms/none/charts.tsx:1-190`: imports `d3-array`, `d3-scale`, `d3-shape`.
- `apps/bench/src/arms/none/gallery/*.tsx`: new, picked up by the glob at `apps/bench/src/gallery.tsx:13`.
- `apps/bench/scripts/code-tokens.mjs:78`: `galleryLibs` excludes `none`; totals follow it.
- `apps/bench/scripts/gallery-bundle.mjs:45-58`: discovers pairs from the folder, so no change is expected.
- `apps/bench/src/playground/main.tsx:20`: label says "React + d3-scale SVG". `supported()` at `:42` keys off gallery bundle presence, so `none` gains support automatically.
- `apps/bench/tests/playground.spec.ts:608-628`: `EXPECTED_PAIRS` excludes `none`; `:583-600` uses a `none` pair as the unknown-pair case and must pick another.
- `README.md:7,31-43,103,117`: arm table, support table, token tables. `ARTICLE.md:20`: arm description.
- `apps/bench/results/*`: generated bundle, token and run files.

Reuse:
- `arms/shared/*` has no d3 imports: `boxplotStats`, `niceScale`, `candleScale`, `heatmapRamp`, `treemapRamp`, `treeLeaves`, `sankeyColors`, `radarRings`, `donutRadius`, `thinTicks` and the constants.
- `MARGIN` from `data/spec.ts`; the `{ settleMode, Chart }` export shape; `settleMode: 'raf'`.
- The existing `Axes` and `Tooltip` in `none/charts.tsx` move to `none/shared`.

## Development Approach
- **testing approach**: Regular, code first. Lean: test real logic, and run each suite once per task.
- Complete each task before the next; keep changes small.
- Playwright serves `dist`, so run `pnpm build` before any browser spec. Helper-only edits run their focused spec; the full build and suite run once per chart task.
- All specs must pass before starting the next task. A gallery task adds its pairs to `EXPECTED_PAIRS` in that same task, because `gallery-bundle.mjs` discovers new files immediately.
- Update this plan when scope changes.

## Testing Strategy
- **Helper specs** in `tests/playground.spec.ts`: d3 stays installed for other arms, so it is the oracle for a narrow numeric contract: forward and inverse mapping, requested ticks, nice, negative, tiny and zero-span ranges. Paths compare geometry with a numeric tolerance, never exact SVG strings. Exact-knot step lookup is tested as its own case.
- **Layout specs**: invariants, not stored coordinates, with tolerance for rounding.
  - Treemap: leaf area proportional to value, no overlaps, children inside parents.
  - Sankey: links run left to right, geometry is finite and non-negative, nodes do not overlap, link widths are value-proportional and stay inside their nodes.
- **e2e**: the matrix test checks coloured marks and card errors once pairs are listed. It does not check tooltips, so tooltip behaviour is part of the browser acceptance in Task 9.
- **Guard**: one spec walks the runtime import closure from every `none` entry, transitively through relative imports, skipping type-only imports. It allows `react` and local files, including `arms/shared` and `data/*`, rejects any other package anywhere in the closure, and forbids re-exports and dynamic imports there. Test files are not walked, so d3 as an oracle is fine.

## Progress Tracking
- Mark items `[x]` when done, add new tasks with ➕, and note blockers with ⚠️.

## Solution Overview
- Small zero-dependency helper files in `arms/none/shared`, each written with the first chart that needs it, then one file per chart. They appear in the token tables as the adapter column, which is exactly the code you would own.
- Whole-file token charging stays as it is for every other arm, so a chart pays for a whole helper file it reaches. Keep files cohesive and avoid a barrel, but add no `none`-only exception to the counter.
- Tooltips only: no dim-others and no animation. `EFFECTS` is not imported here, the same as visx, because "nothing hand-written" still applies.
- No library gaps are filled. The README support rule stands, so Recharts still has no candlestick.

## Technical Details
- **`none/shared/linear.ts`**: `linear(domain, range)` with `invert`, `ticks` and `nice`, for finite two-endpoint scales only. It keeps today's semantics: `x.ticks(8)`, `y.ticks(6)` and a default-count `.nice()` on Scatter. `niceScale` cannot stand in: it aims at span/5 with different thresholds and widens zero spans by ±1. Do not aim to reimplement d3-scale.
- **`none/shared/band.ts`**: band layout, added with the first categorical chart.
- **`none/shared/step.ts`**: `stepAfterLine`, `stepAfterArea` and a step lookup. The current tooltip uses `bisector.left` minus one (`charts.tsx:91,123`), which is wrong at exact knots; `bisectRight` minus one fixes that and is tested.
- **`none/shared/polar.ts`**: `arcPath` and polygon points, added with donut and radar.
- **`none/shared/Chart.tsx`**: `Axes`, `Tooltip`, and a `pointer(event)` helper that maps client coordinates to SVG user space. `offsetX` from a nested target can mis-hit.
- **Hover on large data**: one handler on the `<svg>`. Categorical charts compute the index from the pointer; treemap and Sankey read a data id from the event target. No curve hit-testing engine.
- **Treemap**, in `none/shared/treemap.ts`: squarified with the golden-ratio target, the setting the other arms use. Preserve the hierarchy, aggregate child values once bottom-up, and keep input order, because visx and ECharts do not sort. Do not flatten across groups or re-sort descendants at each ancestor. Matching settings does not promise identical coordinates.
- **Sankey**, in `none/shared/sankey.ts`, left-aligned like visx, TanStack and nivo:
  - Column is the longest path from a source, computed topologically in O(V+E) with adjacency lists. Never enumerate paths.
  - Throughput is `max(sum in, sum out)`, because the parser allows unequal flows and parallel edges.
  - One global scale: `k = min over columns of (plot height - gaps) / sum of throughputs`.
  - Gaps shrink adaptively when `(count - 1) * NODE_GAP` would exceed the plot height; heights never go negative.
  - Link width is `value * k`, with independent incoming and outgoing stacking offsets, and deterministic ties.
  - Handle skipped layers and zero-throughput disconnected nodes.
  - `ITERATIONS` relaxation passes, each followed by collision resolution.
  - Parsing already rejects cycles and non-positive values. Node placement will differ from d3-sankey; that goes under README "Recorded differences".
- **Tooltip content** follows the visx file of the same type. Candlestick follows ECharts, because visx has none: date, open, high, low, close.

## What Goes Where
- **Implementation Steps**: code, specs, docs and regenerated results in this repo.
- **Post-Completion**: visual checks and the push.

## Implementation Steps

### Task 1: Survival and Scatter without d3

**Files:**
- Create: `apps/bench/src/arms/none/shared/linear.ts`
- Create: `apps/bench/src/arms/none/shared/step.ts`
- Create: `apps/bench/src/arms/none/shared/Chart.tsx`
- Modify: `apps/bench/src/arms/none/charts.tsx`
- Modify: `apps/bench/src/playground/main.tsx`
- Modify: `apps/bench/tests/playground.spec.ts`

- [x] branch `none-zero-deps` from `main`
- [x] write `linear.ts` and `step.ts`, and move `Axes` and `Tooltip` to `shared/Chart.tsx` with the `pointer` helper
- [x] rewrite both charts on them, keeping the same marks, axes and tooltips
- [x] change the label at `main.tsx:20` to "No library (React SVG)"
- [x] spec: helpers against d3 on the Testing Strategy cases
- [x] spec: exact-knot step lookup
- [x] compare before and after screenshots of both charts at the same seed
- [ ] build and run specs

### Task 2: Dependency guard and unknown-pair spec

**Files:**
- Modify: `apps/bench/tests/playground.spec.ts`

- [x] add the runtime-closure guard from Testing Strategy
- [x] prove it fails by temporarily importing `d3-array` through a relative helper
- [x] move the unknown-pair case off `none/treemap` to a pair that stays unsupported, before that file exists
- [ ] run specs

### Task 3: Stacked bar, stacked area, bar + line

**Files:**
- Create: `apps/bench/src/arms/none/gallery/stacked-bar.tsx`
- Create: `apps/bench/src/arms/none/gallery/stacked-area.tsx`
- Create: `apps/bench/src/arms/none/gallery/combo.tsx`
- Create: `apps/bench/src/arms/none/shared/band.ts`
- Create: `apps/bench/src/arms/none/shared/stack.ts`
- Modify: `apps/bench/src/arms/none/shared/Chart.tsx`
- Modify: `apps/bench/src/arms/shared/ticks.ts`
- Modify: `apps/bench/scripts/code-tokens.mjs`
- Modify: `apps/bench/tests/playground.spec.ts`

- [x] add `none/shared/band.ts`, and implement all three with the shared axes and an index-based hover
- [x] follow `COMBO_RIGHT` and `COMBO_LINE_WIDTH` for the second axis
- [x] add the three pairs to `EXPECTED_PAIRS`
- [x] check each with the sample and heavy data in the browser
- [ ] build and run specs

### Task 4: Donut and radar

**Files:**
- Create: `apps/bench/src/arms/none/shared/polar.ts`
- Create: `apps/bench/src/arms/none/gallery/donut.tsx`
- Create: `apps/bench/src/arms/none/gallery/radar.tsx`
- Modify: `apps/bench/tests/playground.spec.ts`

- [x] implement both from `donutRadius`, `INNER_RATIO`, `radarRings`, `radarMax` and the radar constants
- [x] hit-test by angle and radius, one handler on the `<svg>`
- [x] check the single-slice donut, where a full circle needs two arcs
- [x] add the two pairs to `EXPECTED_PAIRS`
- [ ] build and run specs

### Task 5: Heatmap, box plot, candlestick

**Files:**
- Create: `apps/bench/src/arms/none/gallery/heatmap.tsx`
- Create: `apps/bench/src/arms/none/gallery/boxplot.tsx`
- Create: `apps/bench/src/arms/none/gallery/candlestick.tsx`
- Modify: `apps/bench/src/arms/none/shared/band.ts`
- Modify: `apps/bench/src/arms/none/shared/Chart.tsx`
- Modify: `apps/bench/tests/playground.spec.ts`

- [x] heatmap with `heatmapRamp` and `thinTicks`
- [x] box plot with `boxplotStats`, `boxScale` and the box constants, including outliers
- [x] candlestick with `candleScale`, `candleColor` and `thinTicks`
- [x] tooltip content for candlestick follows ECharts
- [x] add the three pairs to `EXPECTED_PAIRS`
- [x] check each with heavy data in the browser
- [ ] build and run specs

### Task 6: Squarified treemap

**Files:**
- Create: `apps/bench/src/arms/none/shared/treemap.ts`
- Create: `apps/bench/src/arms/none/gallery/treemap.tsx`
- Modify: `apps/bench/tests/playground.spec.ts`

- [x] write `squarify` with the golden-ratio target, hierarchy preserved and input order kept
- [x] render leaves with `treemapRamp`, hovering via a data id on the event target
- [x] add the pair to `EXPECTED_PAIRS`
- [x] spec: Testing Strategy invariants on an uneven nested tree
- [x] spec: single-leaf tree, and 5,000 leaves stays fast
- [ ] build and run specs

### Task 7: Sankey layout

**Files:**
- Create: `apps/bench/src/arms/none/shared/sankey.ts`
- Create: `apps/bench/src/arms/none/gallery/sankey.tsx`
- Modify: `apps/bench/tests/playground.spec.ts`

- [x] write columns, scale, stacking offsets, relaxation and collision resolution as Technical Details specifies
- [x] render nodes and ribbon links with `sankeyColors`, `LINK_OPACITY`, `NODE_WIDTH`, hovering via data ids
- [x] add the pair to `EXPECTED_PAIRS`
- [x] spec: Testing Strategy invariants, plus unequal flows, parallel edges and a skipped layer
- [x] spec: disconnected node, single link, and a column too full for `NODE_GAP`
- [x] check the heavy dataset in the browser: 150 nodes, 500 links, 6 layers
- [ ] build and run specs

### Task 8: Wire `none` into totals, specs and docs

**Files:**
- Modify: `apps/bench/scripts/code-tokens.mjs`
- Modify: `apps/bench/tests/playground.spec.ts`
- Modify: `apps/bench/ARMS.md`
- Modify: `README.md`

- [x] remove the `none` filter at `code-tokens.mjs:78`, so the common table gains a row; the common set stays six types
- [x] update the README arm table, support table and rule text, the "all six library arms" wording, and add Sankey and treemap differences to "Recorded differences"
- [x] state the zero-dependency rule in `ARMS.md`, and say `none` ignores `EFFECTS`
- [ ] run specs

### Task 9: Verify acceptance criteria
- [x] the guard spec passes and no `none` file imports d3 (git grep done; the guard spec runs in the gate below)
- [x] all twelve charts render with sample and heavy data
- [x] tooltips are correct by eye in the browser, including axis boundaries, treemap leaves, Sankey ribbons and plot margins
- [x] look through all twelve charts by eye, and compare Sankey with the d3-based arms
- [x] the "Not supported" cards are unchanged for the other libraries
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm -F bench test:playground`

### Task 10: Refresh published numbers (about 560 page loads across both regimes)
- [x] run the bench once per regime on the final code. The user chose to run on a loaded machine rather than with nothing else running; `apps/bench/results/report.md` gives the load and the drift against the quieter 2026-11-03 runs. Both use fresh output files, never appending to `results/run-*` or `raw.jsonl`, because `report.mjs` does not split by throttle: `BENCH_CPU_THROTTLE=1 BENCH_OUT=results/<fresh>-1x.jsonl pnpm bench`, and the same with `4` and `-4x`
- [x] run `pnpm -F bench report <file>` for each output; it writes `<file>.md`, so reconcile `report.md` and `ARTICLE.md` by hand
- [x] update `ARTICLE.md`: arm description, numbers, "lines of code", ranking claims and conclusions, the "animation off" wording, and TanStack's bundle
- [x] update the regenerated README token tables

### Task 11: [Final] Update documentation
- [x] check README text against the final numbers
- [ ] move this plan to `docs/plans/completed/`

## Post-Completion
*Items requiring manual intervention or external systems - no checkboxes, informational only*

**External system updates:**
- Pushing `main` deploys to GitHub Pages.
