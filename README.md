# chart-bench

**[Open the playground](https://gusevp.github.io/chart-bench/)** to measure the libraries on your own machine with your own data.

The same two charts — a survival curve with confidence bands and censoring ticks, and a sized scatter plot — built in thirteen ways and measured the same way:

| arm | renderer |
| --- | --- |
| `none` | React and hand-written SVG, no d3 or chart package (the baseline) |
| `nivo` | nivo (SVG) |
| `recharts` | Recharts (SVG) |
| `echarts` | Apache ECharts (Canvas) |
| `visx` | visx (SVG primitives) |
| `tanstack` | TanStack Charts |
| `chartjs` | Chart.js (Canvas) |
| `uplot` | uPlot (Canvas) |
| `plotly` | Plotly.js (WebGL `scattergl`; gallery charts SVG) |
| `agcharts` | AG Charts Community (Canvas) |
| `apex` | ApexCharts (SVG) |
| `scichart` | SciChart.js (WebGL + WASM, Community licence with watermark) |
| `highcharts` | Highcharts (SVG; boost module switches to WebGL above 5,000 points per series) |

Every arm draws the same thing; [`apps/bench/ARMS.md`](apps/bench/ARMS.md) is the contract each port was written against, and each library arm's `NOTES.md` records what the library did natively, what had to be composed, and what had to be hand-drawn.

## Results

Measured on 2026-11-18 on an Apple M3 Pro that was not idle (load average 4–7), in full Chromium with the GPU (Metal). Full tables for both CPU speeds, with spreads, are in [`apps/bench/results/report.md`](apps/bench/results/report.md).

Mount time on the heavy data, median ms. The scatter has 10,000 points and the survival chart 6 series × 1,000 points; 4× is Chrome's CPU slowdown. Sorted by the native scatter.

| library | scatter, native | scatter, 4× | survival, native | survival, 4× | library cost (gzip) |
| --- | ---: | ---: | ---: | ---: | ---: |
| no library | 30.8 | 132.0 | 26.8 | 61.2 | 2.2 KB |
| uPlot | 28.0 | 58.4 | 23.0 | 66.2 | 23.9 KB |
| visx | 41.1 | 174.4 | 22.2 | 86.9 | 25.2 KB |
| TanStack Charts | 61.0 | 254.6 | 36.1 | 151.6 | 56.9 KB |
| Plotly | 73.1 | 322.2 | 110.3 | 465.0 | 460.9 KB |
| ECharts | 83.9 | 346.8 | 56.5 | 234.4 | 164.2 KB |
| Chart.js | 86.7 | 371.9 | 28.0 | 115.3 | 55.6 KB |
| Highcharts | 96.7 | 412.9 | 81.8 | 323.9 | 148.5 KB |
| SciChart | 156.3 | 512.2 | 157.6 | 557.5 | 339 KB + 829 KB WASM |
| AG Charts Community | 157.2 | 581.9 | 154.3 | 538.3 | 328.6 KB |
| ApexCharts | 194.9 | 845.3 | 113.0 | 462.6 | 179.9 KB |
| Recharts | 314.8 | 1,288.3 | 138.4 | 623.0 | 106.4 KB |
| nivo | 3,345.4 | 14,536.6 | 57.1 | 223.9 | 103.3 KB |

- An empty page measures 26.5–28.1 ms at native speed and 18.6–21.3 ms at 4×, and the instrument counts in frames. Read a gap under one frame (16.7 ms), or under 20% on a heavy chart, as a tie.
- uPlot, the no-library arm and visx are the fastest group on the heavy data. With the CPU slowed 4×, uPlot draws the 10,000-point scatter in 58.4 ms, ahead of hand-written SVG (132.0 ms).
- Chart.js and ECharts, the other Canvas libraries, still mount more slowly than plain SVG and visx at 10,000 points.
- The WebGL libraries pay a fixed start-up cost that barely grows with the data: SciChart takes about 156.8 ms at native speed whatever the size (WASM and GPU set-up), Plotly 65.6–110.3 ms. At 10,000 points they beat Recharts and nivo but not the SVG baseline.
- A timer at React's commit reports 3.0 ms for Recharts on the 10,000-point scatter. Stopping the clock after the frame is drawn gives 314.8 ms. The harness records both.
- The nivo scatter is its SVG component. Its Canvas scatter was not measured.
- These numbers are not comparable with the 2026-11-06 run. That run used Playwright's headless shell, which has no GPU, so WebGL ran in software; this one uses full Chromium, and every library moved, Canvas ones most at 4×.

## Playground

Pick libraries, paste your own data as JSON, and the playground measures each library alone, in one visible lab frame, with a fresh page load per run: 1 warm-up and 5 measured runs, reported as median ± IQR/2. A `shell` row (the page with no chart) shows the floor of your machine and display. Metrics: mount time, update time, main-thread blocking during mount (Long Animation Frames, Chromium only, `n/a` elsewhere), DOM nodes, bundle KB, code tokens and, on the display cards afterwards, the worst frame while you hover. Numbers are for your machine and comparable within one session only. The page opens with an unmeasured preview of the default selection; nothing is timed until you press Render. A library with no run finished within 60 s is shown as `> 60 s` and its chart is not drawn again; the playground runs in one tab, so an SVG library on the ~100k sample can freeze it until that run ends.

The "Animation and hover effects" checkbox, on by default, controls the display cards. On, each library runs with its built-in animation and hover behaviour, including its own dim-the-others option where it has one; nothing is hand-written, so visx and the no-library arm stay as they are, and custom marks such as nivo's scatter nodes don't animate. Off keeps the static baseline, which still includes a few built-in hover styles such as nivo's Sankey dimming. Mount, update, blocking and DOM nodes always come from static charts, because a Canvas library reports done after its animation while an SVG chart settles at commit. The hover column measures the state of the checkbox, and changing it clears that column.

Twelve chart types: Survival and Scatter, plus stacked bar, stacked area, donut, radar, bar + line on two axes, heatmap, treemap, Sankey, box plot and candlestick. Each library renders the same pasted JSON.

Run it with `pnpm build && pnpm -F bench preview`, then open `http://localhost:4173/`. `pnpm build` runs `scripts/gallery-bundle.mjs` and a second Vite build (`vite.gallery.config.ts`, entry `gallery.html`) before the main build, so chart code for the ten new types stays out of the arm pages and `bundle.json`. Its specs: `pnpm -F bench test:playground`. `.github/workflows/pages.yml` deploys the same build to GitHub Pages on every push to `main`.

### Which libraries support which type

A library supports a type when it ships a component or series for it, a published package or plugin provides it, or, for visx and TanStack, its own components or marks draw the geometry. A documented render prop that only paints geometry the library computed (Recharts Sankey `link` and `node`) counts as supported. Writing the path, cell or custom shape ourselves does not, so Recharts has no candlestick and nivo has no bar + line. uPlot stacks by being given running totals, since it has no stacking option; its pie, heatmap, box and candlestick pages are demos drawn in hooks, not shipped series. AG Charts is the free Community edition, where radar, heatmap, treemap, Sankey, box plot and candlestick are Enterprise features. The no-library arm is the exception by design: it writes everything by hand, so it draws all twelve types. An unsupported pair shows a "Not supported" card and is not measured.

| Type | Recharts | nivo | ECharts | Chart.js | visx | TanStack | No library | uPlot | Plotly | AG Charts Community | ApexCharts | SciChart | Highcharts |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Survival, Scatter | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Stacked bar | yes | `@nivo/bar` | yes | yes | `BarStack` | yes | yes | yes | yes | yes | yes | yes | yes |
| Stacked area | yes | `@nivo/line` | yes | yes | `AreaStack` | yes | yes | yes | yes | yes | yes | yes | yes |
| Donut | yes | `@nivo/pie` | yes | yes | `Pie` | yes | yes | Not supported | yes | yes | yes | yes | yes |
| Radar | yes | `@nivo/radar` | yes | yes | `LineRadial` | yes | yes | Not supported | yes | Enterprise only | yes | yes | `highcharts-more` |
| Bar + line | yes | Not supported | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| Heatmap | Not supported | `@nivo/heatmap` | yes | `chartjs-chart-matrix` | `@visx/heatmap` | yes | yes | Not supported | yes | Enterprise only | yes | yes | `modules/heatmap` |
| Treemap | yes | `@nivo/treemap` | yes | `chartjs-chart-treemap` | `@visx/hierarchy` | yes | yes | Not supported | yes | Enterprise only | yes | Not supported | `modules/treemap` |
| Sankey | yes | `@nivo/sankey` | yes | `chartjs-chart-sankey` | `@visx/sankey` | yes | yes | Not supported | yes | Enterprise only | Not supported (`apexsankey` is a separate commercial package) | Not supported | `modules/sankey` |
| Box plot | Not supported | `@nivo/boxplot` | yes | `@sgratzl/chartjs-chart-boxplot` | `@visx/stats` | yes | yes | Not supported | yes | Enterprise only | yes | yes | `highcharts-more` |
| Candlestick | Not supported | Not supported | yes | `chartjs-chart-financial` | Not supported | yes | yes | Not supported | yes | Enterprise only | yes | yes | `modules/stock` |

For the ten gallery types the source of truth is `apps/bench/results/gallery-bundle.json`: a pair with no entry there is not supported. Survival and Scatter are not in it; every library draws them.

### Pasting data

Every type has a typical and a heavy sample, and all but donut, radar, Sankey and box plot have a ~100k sample (box plot's heavy sample already has 100,000 values); the textarea shows the format. Optional `color` falls back to the shared palette. Ids must be unique where noted, and a parse error names the field.

Stacked bar, stacked area and radar take one non-negative value per category, unique category names and unique series ids:

```json
{"categories": ["Q1", "Q2"], "series": [{"id": "A", "color": "#4e79a7", "values": [3, 5]}]}
```

Bar + line takes the same `categories`, one `bars` series and one `line` series (right axis) with different ids:

```json
{"categories": ["Q1", "Q2"], "bars": {"id": "Sales", "values": [3, 5]}, "line": {"id": "Margin", "values": [0.2, 0.4]}}
```

Donut takes non-negative slices with unique ids, not all zero:

```json
{"slices": [{"id": "A", "value": 3}, {"id": "B", "value": 5}]}
```

Heatmap takes `values[y][x]`, one row per `ys` entry and one number per `xs` entry, labels unique:

```json
{"xs": ["Mon", "Tue"], "ys": ["AM", "PM"], "values": [[1, 2], [3, 4]]}
```

Treemap takes one root. Leaves carry a positive `value`, parents carry `children` and no value, ids are unique across the tree, nesting is at most 8 levels:

```json
{"id": "root", "children": [{"id": "a", "value": 3}, {"id": "g", "children": [{"id": "b", "value": 2}]}]}
```

Sankey links must name known nodes, with positive values, no self-links and no cycles:

```json
{"nodes": [{"id": "A"}, {"id": "B"}], "links": [{"source": "A", "target": "B", "value": 3}]}
```

Box plot takes raw values; quartiles and whiskers are computed once (linear-interpolation quartiles, Tukey whiskers at 1.5 IQR, never shorter than the box) and handed to every library that takes computed stats. Group ids are unique:

```json
{"groups": [{"id": "A", "values": [1, 2, 3, 4, 30]}]}
```

Candlestick needs at least two candles, `t` as `YYYY-MM-DD` and unique, and `low <= open, close <= high`. Candles are sorted by date:

```json
{"candles": [{"t": "2024-01-02", "open": 10, "high": 12, "low": 9, "close": 11}, {"t": "2024-01-03", "open": 11, "high": 13, "low": 10, "close": 12}]}
```

### Code size

Implementation burden of these ports under this contract, not a ranking of how simple each library is. Each cell is the token count of that chart's code after TypeScript normalizes it to JS/JSX, excluding imports, comments and whitespace. N/A is not zero. `pnpm -F bench tokens` prints these tables and writes `apps/bench/results/code-tokens.json`, which lists the counted files for each cell. The playground shows each pair's count on its card and in the results table, where each column's lowest and highest values are highlighted; Survival and Scatter share one count because both live in `charts.tsx`.

| Chart | Recharts | nivo | ECharts | Chart.js | visx | TanStack | No library | uPlot | Plotly | AG Charts | ApexCharts | SciChart | Highcharts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Survival + Scatter | 1064 | 993 | 1117 | 1214 | 1683 | 720 | 3134 | 2409 | 1024 | 1254 | 1616 | 1775 | 904 |
| Box plot | N/A | 1270 | 1258 | 1227 | 1507 | 1198 | 3448 | N/A | 1365 | N/A | 1642 | 1881 | 1274 |
| Candlestick | N/A | N/A | 1441 | 1427 | N/A | 1221 | 3246 | N/A | 1512 | N/A | 1698 | 1784 | 1340 |
| Bar + line | 363 | N/A | 502 | 457 | 898 | 438 | 2435 | 1205 | 652 | 484 | 860 | 1870 | 492 |
| Donut | 206 | 207 | 479 | 350 | 439 | 307 | 994 | N/A | 602 | 387 | 833 | 836 | 448 |
| Heatmap | N/A | 475 | 804 | 857 | 939 | 580 | 1848 | N/A | 800 | N/A | 1043 | 1134 | 728 |
| Radar | 555 | 442 | 704 | 588 | 936 | 584 | 1199 | N/A | 827 | N/A | 968 | 1251 | 674 |
| Sankey | 434 | 229 | 468 | 462 | 673 | 433 | 1979 | N/A | 754 | N/A | N/A | N/A | 497 |
| Stacked area | 288 | 280 | 395 | 370 | 909 | 344 | 2275 | 1114 | 574 | 413 | 727 | 1713 | 410 |
| Stacked bar | 279 | 255 | 387 | 337 | 846 | 343 | 2468 | 1126 | 555 | 387 | 704 | 1701 | 391 |
| Treemap | 572 | 428 | 755 | 917 | 740 | 581 | 1545 | N/A | 997 | N/A | 1054 | N/A | 806 |

For gallery totals, compare the six types every one of the original seven arms implements: donut, radar, Sankey, stacked area, stacked bar and treemap. Shared files count once per library. A library added later gets a total only if it implements all six, so uPlot, AG Charts, ApexCharts and SciChart show only their coverage.

| Common six types | Chart files | Adapter | `arms/shared` | Total | Gallery coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Recharts | 1708 | 36 | 511 | 2255 | 7/10 |
| nivo | 1201 | 0 | 554 | 1755 | 8/10 |
| ECharts | 1602 | 172 | 511 | 2285 | 10/10 |
| Chart.js | 1840 | 105 | 511 | 2456 | 10/10 |
| visx | 3681 | 37 | 554 | 4272 | 9/10 |
| TanStack | 1706 | 41 | 554 | 2301 | 10/10 |
| No library | 3065 | 3908 | 554 | 7527 | 10/10 |
| uPlot | — | — | — | — | 3/10 |
| Plotly | 1391 | 351 | 554 | 2296 | 10/10 |
| AG Charts | — | — | — | — | 4/10 |
| ApexCharts | — | — | — | — | 9/10 |
| SciChart | — | — | — | — | 8/10 |
| Highcharts | 1214 | 200 | 554 | 1968 | 10/10 |

- **Counted:** the chart file, plus every file it reaches under `apps/bench/src/arms`: the library's own `shared/` (the adapter column) and `arms/shared/`. That includes library registration such as `use([...])`, callbacks and data reshaping.
- **Not counted:** imports, comments, `src/data/*` and each arm's `main.tsx`. Types in these files emit no tokens. Typing and dependency setup are not measured.
- **Whole files:** a chart pays for all of a file it reaches. Chart.js Sankey pays for `fixWidth` and `fixHeight` without using them, and all four candlesticks pay for the box statistics in `boxplot.ts` because `candles.ts` imports `niceScale` from it. uPlot, AG Charts, ApexCharts and SciChart keep their wrapper and helpers in one arm file that the survival, scatter and gallery charts all import, so their Survival + Scatter counts include gallery helpers. Treat small gaps as noise.
- **Effects are counted.** Counts include the code that switches effects on. Bundles include what it pulls in: TanStack's `motion` renderer adds about 15 KB.
- **Benchmark plumbing is not removed.** The Chart.js and ECharts adapters hold settle code, and chart files still pass `onSettled`.
- **Box plot:** the input is raw values, and six ports chose the shared `boxplotStats`. Native or addon alternatives exist, and their equivalence was not evaluated. nivo also hides outliers, as recorded below.

### Recorded differences

- **Treemap.** Leaf areas match in the seven original arms; the Plotly, ApexCharts and Highcharts treemaps use their own layouts and were not compared. Chart.js tiles with squarify ratio 1 and has no option to change it; the other six use the golden ratio, so Chart.js rectangles land in different places.
- **Sankey.** Node width, node gap, iterations, alignment, link curve and colours are aligned wherever the library has the option. nivo, visx and TanStack run d3-sankey and draw alike; Recharts and ECharts use their own d3-derived layouts and land close. Chart.js has no iteration or curve option, takes its node gap in height-scaled units and orders nodes with its own layout, so it is the visible outlier. nivo has fixed iterations and a fixed curve.
- **No-library treemap.** Same squarify steps and golden ratio as d3, rounded to whole pixels when drawn. The last row takes what is left of its parent, not a computed share, so float drift cannot leave a sub-pixel gap. On both sample sizes its rectangles match d3-hierarchy's.
- **No-library Sankey.** Its own layout, left-aligned, so node placement differs from d3-sankey: each relaxation pass moves a node all the way to the value-weighted mean of its neighbours' centres.
  - Gaps are capped at 0.9 of the plot height across the fullest column, where d3-sankey lets them take all of it and nodes collapse to zero height.
  - Deep graphs get nodes narrower than `NODE_WIDTH`, so links keep running left to right; visx keeps the width fixed.
- **Box plot.** nivo has no outlier layer and a custom one would be our geometry, so it hides outliers; its node count and timing are not like for like. Its band scale has one padding for both ends, so the outermost boxes sit nearer the middle than in the other five (27.5px at 2 groups, 16px at 8, 3.9px at 40).
- **TanStack box plot.** `boxY` takes only raw values, so the wrapper draws the shared boxes with `link`, `barY`, `tickY` and `dot`.
- **Stacked bar, stacked area, bar + line.** Bar width and y domain are each library's own. Bars fill about 0.9 of the slot in nivo (its 0.1 padding default), 0.8 in visx, TanStack and the no-library arm (`padding(0.2)`) and in Recharts (its default), 0.72 in Chart.js and about 0.69 in ECharts (their defaults; ECharts leaves a 31% gap around a single stack). The y top is each library's rounding: d3 `nice()` in visx and nivo bar, and the same rounding in the no-library arm, gives 0..130 on the typical stacked bar where ECharts gives 0..150, and nivo stacked area has `max: 'auto'` without `nice`, so its top is the exact maximum. Axes are labelled, and timing and KB do not change.

### Reading the numbers

- Update time cannot resolve below two frames, so anything near the floor reads the same. A cell within two frames of the `shell` row is greyed. CPU throttling is what separates fast libraries.
- The per-type KB comes from `results/gallery-bundle.json`: an isolated build per library and type pair, minus an empty stub, gzipped. It is not comparable with `bundle.json`, which measures the arm pages. Plugin packages and their setup (Chart.js financial needs `chartjs-adapter-luxon` and `luxon`) count.
- Below 1400px wide the page is one column. A run pauses while the measuring panel is scrolled offscreen, because the browser throttles an offscreen frame.
- The known-cost test page stays on Survival and Scatter and shows Not supported for the new types.
- ECharts' Survival and Scatter updates still rebuild the chart, because their wrapper is shared with the benchmark harness and stays frozen; its ten gallery types update the existing chart. SciChart rebuilds its surface on every data change, for all its charts: `scichart-react` builds the chart once and a docs-following in-place update would need per-chart update code, so its update time includes a full rebuild.

## Method

**Data.** Seeded generators (`apps/bench/src/data/generate.ts`, splitmix32), so every library gets byte-identical input. All data is synthetic.

| dataset | survival | scatter |
| --- | --- | --- |
| typical | 3 series × 200 points | 500 points |
| heavy | 6 series × 1,000 points | 10,000 points |
| huge | 10 series × 10,000 points | 100,000 points |

**Timeouts.** Each attempt loads a fresh page and gets 60 s (`BENCH_TIMEOUT_MS`) to settle. A run over the cap is recorded as timed out and counted as slower than every finished run, so the median stays a median. After five timeouts the cell stops, because five of nine runs over the cap already put the median over it; the report then shows `> 60 s` with the slowest run that did finish. `BENCH_SIZES` picks the sizes to run: the default is `typical,heavy`; add `huge` to run the 100k tier.

**Mount time** — [`packages/bench-stage`](packages/bench-stage). The chart is not rendered on page load; the runner calls `window.benchStage.mount()`, so module evaluation and hydration are excluded. The clock stops two animation frames after the chart reports done, which puts it after the browser has painted.

- SVG arms report done when React commits (`raf` mode).
- Canvas arms report done from the library's own "rendered" event (`signal` mode) — otherwise the timer would stop on a blank canvas.
- Both modes go through the **same** double-rAF before the mark. Marking immediately on the signal stops the clock before paint and hands every Canvas library a free frame.

The double rAF makes the instrument frame-quantised: an empty `shell` page measured ≈ 1.1–1.7 frames (18.6–28.1 ms at 60 Hz) on 2026-11-18. The default arm list omits `shell`; pass it through `BENCH_ARMS` to measure it. Differences under one frame (≈ 16.7 ms at 60 Hz) are noise.

**Hover** — the pointer sweeps the chart in 60 steps while a rAF loop records frame gaps; the reported number is the longest gap. Also frame-quantised.

**DOM nodes** — elements inside the chart container after mount. Diagnostic: Canvas arms report a handful.

**Bundle** — gzipped JS + CSS each arm's entry loads, from Vite's build manifest, minus the `shell` entry (same page, no chart library) = *library cost*.

**Runs** — production build (`vite build` + `vite preview`), headless Chromium via Playwright, one worker, one warm-up then 9 measured page loads per cell. Reported as median ± half the IQR. Never mean, never p95.

## Run it

```sh
pnpm install
pnpm build                # also writes apps/bench/results/bundle.json
pnpm bench                # BENCH_ARMS=none,nivo BENCH_REPEATS=9 to narrow
pnpm report               # results/raw.md
```

Close everything else first: a dev server or a browser tab in the background moves every number.
