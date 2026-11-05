# chart-bench

The same two charts — a survival curve with confidence bands and censoring ticks, and a sized scatter plot — built in seven ways and measured the same way:

| arm | renderer |
| --- | --- |
| `none` | React + d3-scale, hand-written SVG (the baseline) |
| `nivo` | nivo (SVG) |
| `recharts` | Recharts (SVG) |
| `echarts` | Apache ECharts (Canvas) |
| `visx` | visx (SVG primitives) |
| `tanstack` | TanStack Charts |
| `chartjs` | Chart.js (Canvas) |

Every arm draws the same thing; [`apps/bench/ARMS.md`](apps/bench/ARMS.md) is the contract each port was written against, and each arm's `NOTES.md` records what the library did natively, what had to be composed, and what had to be hand-drawn.

## Playground

Pick libraries, paste your own data as JSON, and the playground measures each library alone, in one visible lab frame, with a fresh page load per run: 1 warm-up and 5 measured runs, reported as median ± IQR/2. A `shell` row (the page with no chart) shows the floor of your machine and display. Metrics: mount time, update time, main-thread blocking during mount (Long Animation Frames, Chromium only, `n/a` elsewhere), DOM nodes, bundle KB and, on the display cards afterwards, the worst frame while you hover. Numbers are for your machine and comparable within one session only.

Twelve chart types: Survival and Scatter, plus stacked bar, stacked area, donut, radar, bar + line on two axes, heatmap, treemap, Sankey, box plot and candlestick. Each library renders the same pasted JSON.

Run it with `pnpm build && pnpm -F bench preview`, then open `http://localhost:4173/`. `pnpm build` runs `scripts/gallery-bundle.mjs` and a second Vite build (`vite.gallery.config.ts`, entry `gallery.html`) before the main build, so chart code for the ten new types stays out of the arm pages and `bundle.json`. Its specs: `pnpm -F bench test:playground`. `.github/workflows/pages.yml` deploys the same build to GitHub Pages on every push to `main`.

### Which libraries support which type

A library supports a type when it ships a component or series for it, a published package or plugin provides it, or, for visx and TanStack, its own components or marks draw the geometry. A documented render prop that only paints geometry the library computed (Recharts Sankey `link` and `node`) counts as supported. Writing the path, cell or custom shape ourselves does not, so Recharts has no candlestick and nivo has no bar + line. An unsupported pair shows a "Not supported" card and is not measured.

| Type | Recharts | nivo | ECharts | Chart.js | visx | TanStack | No library |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Survival, Scatter | yes | yes | yes | yes | yes | yes | yes |
| Stacked bar | yes | `@nivo/bar` | yes | yes | `BarStack` | yes | Not supported |
| Stacked area | yes | `@nivo/line` | yes | yes | `AreaStack` | yes | Not supported |
| Donut | yes | `@nivo/pie` | yes | yes | `Pie` | yes | Not supported |
| Radar | yes | `@nivo/radar` | yes | yes | `LineRadial` | yes | Not supported |
| Bar + line | yes | Not supported | yes | yes | yes | yes | Not supported |
| Heatmap | Not supported | `@nivo/heatmap` | yes | `chartjs-chart-matrix` | `@visx/heatmap` | yes | Not supported |
| Treemap | yes | `@nivo/treemap` | yes | `chartjs-chart-treemap` | `@visx/hierarchy` | yes | Not supported |
| Sankey | yes | `@nivo/sankey` | yes | `chartjs-chart-sankey` | `@visx/sankey` | yes | Not supported |
| Box plot | Not supported | `@nivo/boxplot` | yes | `@sgratzl/chartjs-chart-boxplot` | `@visx/stats` | yes | Not supported |
| Candlestick | Not supported | Not supported | yes | `chartjs-chart-financial` | Not supported | yes | Not supported |

The source of truth is `apps/bench/results/gallery-bundle.json`: a pair with no entry there is not supported.

### Pasting data

Every type has a sample at both sizes; the textarea shows the format. Optional `color` falls back to the shared palette. Ids must be unique where noted, and a parse error names the field.

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

### Recorded differences

- **Treemap.** Leaf areas match in all six libraries. Chart.js tiles with squarify ratio 1 and has no option to change it; the other five use the golden ratio, so Chart.js rectangles land in different places.
- **Sankey.** Node width, node gap, iterations, alignment, link curve and colours are aligned wherever the library has the option. nivo, visx and TanStack run d3-sankey and draw alike; Recharts and ECharts use their own d3-derived layouts and land close. Chart.js has no iteration or curve option, takes its node gap in height-scaled units and orders nodes with its own layout, so it is the visible outlier. nivo has fixed iterations and a fixed curve.
- **Box plot.** nivo has no outlier layer and a custom one would be our geometry, so it hides outliers; its node count and timing are not like for like. Its band scale has one padding for both ends, so the outermost boxes sit nearer the middle than in the other four (27.5px at 2 groups, 16px at 8, 3.9px at 40).
- **TanStack box plot.** `boxY` takes only raw values, so the wrapper draws the shared boxes with `link`, `barY`, `tickY` and `dot`.

### Reading the numbers

- Update time cannot resolve below two frames, so anything near the floor reads the same. A cell within two frames of the `shell` row is greyed. CPU throttling is what separates fast libraries.
- The per-type KB comes from `results/gallery-bundle.json`: an isolated build per library and type pair, minus an empty stub, gzipped. It is not comparable with `bundle.json`, which measures the arm pages. Plugin packages and their setup (Chart.js financial needs `chartjs-adapter-luxon` and `luxon`) count.
- Below 1400px wide the page is one column. A run pauses while the measuring panel is scrolled offscreen, because the browser throttles an offscreen frame.
- The known-cost test page stays on Survival and Scatter and shows Not supported for the new types.
- ECharts' Survival and Scatter updates still rebuild the chart, because their wrapper is shared with the benchmark harness and stays frozen; its ten gallery types update the existing chart.

## Method

**Data.** Seeded generators (`apps/bench/src/data/generate.ts`, splitmix32), so every library gets byte-identical input. All data is synthetic.

| dataset | survival | scatter |
| --- | --- | --- |
| typical | 3 series × 200 points | 500 points |
| heavy | 6 series × 1,000 points | 10,000 points |

**Mount time** — [`packages/bench-stage`](packages/bench-stage). The chart is not rendered on page load; the runner calls `window.benchStage.mount()`, so module evaluation and hydration are excluded. The clock stops two animation frames after the chart reports done, which puts it after the browser has painted.

- SVG arms report done when React commits (`raf` mode).
- Canvas arms report done from the library's own "rendered" event (`signal` mode) — otherwise the timer would stop on a blank canvas.
- Both modes go through the **same** double-rAF before the mark. Marking immediately on the signal stops the clock before paint and hands every Canvas library a free frame.

The double rAF makes the instrument frame-quantised: an empty `shell` page measures ≈ 1.3 frames (20–24 ms at 60 Hz). Differences under one frame (≈ 16.7 ms at 60 Hz) are noise.

**Hover** — the pointer sweeps the chart in 60 steps while a rAF loop records frame gaps; the reported number is the longest gap. Also frame-quantised.

**DOM nodes** — elements inside the chart container after mount. Diagnostic: Canvas arms report a handful.

**Bundle** — gzipped JS + CSS each arm's entry loads, from Vite's build manifest, minus the `shell` entry (same page, no chart library) = *library cost*.

**Runs** — production build (`vite build` + `vite preview`), headless Chromium via Playwright, one worker, one warm-up then 9 measured page loads per cell. Reported as median ± half the IQR. Never mean, never p95.

## Run it

```sh
pnpm install
pnpm build                # also writes apps/bench/results/bundle.json
pnpm bench                # BENCH_ARMS=none,nivo BENCH_REPEATS=9 to narrow
pnpm report               # results/report.md
```

Close everything else first: a dev server or a browser tab in the background moves every number.
