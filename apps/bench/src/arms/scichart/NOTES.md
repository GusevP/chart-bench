# SciChart.js arm

- scichart 6.0.15, scichart-react 2.1.0 (`SciChartReact` with an `initChart` function). Community licence: no key, "SCICHART" watermark bottom-left.
- One `SciChartSurface.create` surface per chart (the shared-WASM-context, copy-canvas mode the React wrapper and docs use by default), light theme (`SciChartJSLightTheme`).
- **The renderer depends on the browser, and the bench runner gets software WebGL.**
  - In v6 the default ("auto") is WebGPU on an Apple GPU adapter and WebGL everywhere else. You can override it with the `IS_WEB_GPU` localStorage key ("1"/"0"). The arm leaves the default alone.
  - agent-browser's Chrome 152 on this Mac picked WebGPU (the surface canvas holds a `webgpu` context).
  - The Playwright Chromium the runner launches (HeadlessChrome 156) has no Apple adapter, so SciChart falls back to WebGL. That WebGL is **SwiftShader**, i.e. software: `UNMASKED_RENDERER_WEBGL` = "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device …))", and the surface canvas holds a `2d` copy target.
  - So the recorded numbers are a CPU-rasterised WebGL engine. See "Bench runner" below.

## WASM loading

- `import wasmUrl from 'scichart/_wasm/scichart.wasm?url'` (and `scichart-nosimd.wasm?url`) plus `SciChartSurface.configure({ wasmUrl, wasmNoSimdUrl })` at module scope of `surface.ts`, which every chart file (survival, scatter, each gallery type) imports. Vite serves the files from `node_modules` in dev and emits them hashed into `dist/assets/` in the build, so they stay same-origin and work under `base: './'`. No `vite.config.ts` change and no `public/` copy.
- Why not `loadWasmLocal()` or the wrapper's default: scichart-react sets the root-absolute `/scichart.wasm`, which breaks under a sub-path base. `loadWasmLocal()` expects someone to copy `_wasm/` next to each page.
- Only the core is fetched for 2D charts: `scichart.wasm`, 1.6 MB raw / 829 KB gzip -9. The no-SIMD build is only fetched by browsers without wasm SIMD. wasm64 defaults to `Never`, so it isn't imported.
- `scripts/bundle-size.mjs` counts JS/CSS only, so the 338.9 KB "libraryKb" leaves out the 829 KB of WASM.
- `SciChartSurface.UseCommunityLicense()` stops the licence check from probing the local licence wizard at `http://localhost:24278` (and 24279…) on every page load.

## Network requests at runtime

- `GET <base>/assets/scichart-<hash>.wasm`, same-origin (dev: `/@fs/…/scichart/_wasm/scichart.wasm`).
- **Telemetry:** `OPTIONS` + `POST https://dc.services.visualstudio.com/v2/track` (Azure Application Insights).
  - It fires from the licence check on the first chart. Payload: event "LicenseSet", licence type, version, a random user/session id, and for Community **the page URL**.
  - Throttled to once per hour per browser by an `scUser` cookie. The only things that suppress it are a licence without the "TE" feature, or `navigator.onLine === false`.
  - There is no API to turn it off. A fresh browser profile sends it on its first SciChart page.
  - It is a non-blocking `fetch` with errors swallowed. It did not appear in a later run within the hour.
- No CDN fetches, no font or licence-server requests.

## Both charts

- **900 × 600** — native: `SciChartReact` `style={{ width, height }}`. The wrapper sets `SciChartDefaults.disableAspect`.
- **MARGIN** — composed: surface `padding` gives top/right. `axisThickness` sets only the _label_ band, and the axis title is measured from its glyph bounds and added on top. The 5 px major ticks are added too. So the thickness is MARGIN minus 16 px for x and 14 px for y: 5 px of ticks plus an 11 px / 9 px title at 12 px font with title padding 0.
  - Survival `seriesViewRect` = 56, 20, 824 × 536, which is exact.
  - Scatter = 55, 20, 825 × 539. The shorter titles "X"/"Y" measure 1–3 px smaller. **Deviation: 1 px left, 3 px bottom.**
- **Animation** — native: SciChart series have no animation unless one is passed. With `EFFECTS` on, survival gets a built-in `SweepAnimation` and scatter a `FadeAnimation`. There is no built-in dim-the-others on hover, only `SeriesSelectionModifier` callbacks that would need hand-written styling, so none. `CursorModifier` has no transitions.
- **Axes, ticks, labels, horizontal grid** — native: `NumericAxis` with `axisTitle`, and `labelPrecision` (the default prints `50.0`).
  - Defaults overridden: the y axis sits on the **right** (`EAxisAlignment.Left`), alternating axis bands are drawn (`drawMajorBands: false`), minor grid lines and minor ticks are on (off), and x major grid is off for horizontal-only lines.
- **Tooltip** — native `CursorModifier` with a `tooltipDataTemplate`. Note `showTooltip` defaults to **false**.
- **Colours** — native. The band fill is `${color}26` (15% alpha as an `#RRGGBBAA` suffix), which assumes the palette's 6-digit hex.
- **No legend** — native: no `LegendModifier`.

## Survival

- **Step-after line** — native: `FastLineRenderableSeries` with `lineType: ELineType.Digital` (horizontal then vertical). `isDigitalLine` still works but `lineType` "replaces" it.
- **Confidence band** — native: `FastBandRenderableSeries` over an `XyyDataSeries` (y = upper, y1 = lower), with `isDigitalLine: true` (bands have no `lineType`) and `strokeThickness: 0`. Both `fill` and `fillY1` are set to 15%. Gotcha: `fillY1` is the colour for y1 < y, which with y = upper is the region actually drawn here. So `fillY1` is the one that matters, despite its name.
- **Censoring ticks** — composed: an `XyScatterRenderableSeries` of the censored points. Its point marker subclasses `CrossPointMarker` and overrides the public `drawSprite` to stroke only the vertical bar, 9 px tall (±4). The library rasterises it once into a sprite and stamps it per point, so this scales to the huge size. Annotations (one object per tick) were not tried.
- **Axes 0..last x / 0..1, "Days"/"Survival"** — native: `visibleRange` + `autoRange: EAutoRange.Never`.
- **Tooltip: pointer x + each series' value** — composed. `CursorModifier`'s x-slice hit test (`hitTestXSlice`) returns the _nearest_ point by x, not the step in force.
  - The template takes the pointer's data x from `hitTestPointValues.x`. If the nearest point lies to the right of the pointer, it steps back one index into the series' own points.
  - The modifier is limited to the line series (`includedSeriesIds`), so the band and tick series add no rows.
  - Checked at pointer x = 273.33: tooltip "Arm A 0.628 / Arm B 0.659 / Arm C 0.629" matches a step lookup on the generated data (steps at x = 273, 272, 272).

## Scatter

- **Circle radius = `point.size`, 70% opacity** — native: `FastBubbleRenderableSeries` over an `XyzDataSeries` with z = diameter in CSS px (`2 * size`), and `EllipsePointMarker` with `opacity: 0.7`.
  - The bubble scales one marker sprite to each z. The marker is sized to the largest bubble (`2 * max size`), because the default small sprite blurs when scaled up.
- **Nice linear axes, "X"/"Y"** — composed: SciChart has no nice-rounding option (autorange fits the data exactly). The range is min/max floored/ceiled to the major tick spacing from `wasmContext.NiceDoubleScale.CalculateTickSpacing`, the engine's own tick-spacing routine that `NumericDeltaCalculator` uses, with `autoRange: Never`.
- **Tooltip: nearest point's series id and x, y** — native hit test, composed choice: `CursorModifier` with `hitTestRadius: 20` hit-tests each series. The template keeps the `isHit` result with the smallest `distance`, and returns `[]` (no tooltip) when nothing is within 20 px plus the bubble radius.

## Casts

- Survival/scatter: none. `!` used twice under `noUncheckedIndexedAccess`: `byName.get(info.seriesName)!` (the map is keyed by the same series ids) and `points[...]!`.
- Gallery: one, `infos[0] as HeatmapSeriesInfo` in the heatmap tooltip (`tooltipDataTemplate` is typed with the base `SeriesInfo`).

## Gotchas

- `rendered` (the obvious "rendered" event) is CPU-side and fires **before** the frame reaches the visible canvas. See the settle section.
- `drawSprite` draws into a sprite canvas larger than the marker. Centre on `context.canvas.width/height`, not the `width`/`height` arguments, or the mark lands off-centre.
- Without `UseCommunityLicense()`, every page load tries the licence wizard on localhost first.
- `Math.max(...array)` over 100k points risks the argument limit, so the marker size uses a `reduce`.
- **Unexplained slow start in a fresh agent-browser profile (not reproduced in the runner).** These slow runs came right after starting a new agent-browser session (Chrome 152, WebGPU); the cause is not established:
  - survival/typical: 3078 / 2721 / 2519 ms. The remounts stayed slow too.
  - scatter/huge: 4451 ms, then 60 / 50 ms.
  - survival/huge: 235 ms from the start.
  - In one logged slow run, SciChart's own frame completed at about 1.08 s and the rest (about 2 s) was BenchStage's double rAF.
  - Chart.js in the same kind of fresh session settled in 46 ms. A second SciChart page load in the same browser was about 100 ms.
  - Forced WebGL showed one similar first page (2.5 s, `create()` 2.2 s), then 177 ms.

  The Playwright runner showed nothing like it: no multi-second outliers after its warm-up. The largest spread was survival/huge at 2.2 s vs 1.47 s.

## Settle mode: `signal`

- Hook: `sciChartSurface.renderInstructionsCompleted`, subscribed inside `initChart` right after the series and modifiers are added (before the first frame). `onSettled()` is called on the first event whose `isInvalidated` argument is `false`, and the handler unsubscribes.
  - The library documents this as the only render event that waits for the GPU: a `gl.fenceSync` poll on WebGL, `GPUQueue.onSubmittedWorkDone()` on WebGPU.
  - `rendered` and `renderInstructionsSubmitted` mean "draw calls issued". `renderedToDestination` is deprecated.
- Evidence, from a one-off instrumented run with forced WebGL. In each handler, the surface's own canvas was drawn into a scratch 2D canvas, and non-background pixels were counted. Times are ms after `bench:start`:

  | event                                                | t (ms) | inked pixels |
  | ---------------------------------------------------- | ------ | ------------ |
  | `rendered`                                           | 3069   | **0**        |
  | `renderedToDestination` (copy to the surface canvas) | 3245   | 65,108       |
  | `renderInstructionsCompleted`                        | 3319   | 65,108       |

  So `rendered` would have stopped the clock on a blank canvas.

- Under WebGPU (the default here) the surface canvas holds a `webgpu` context. `drawImage` readback returns nothing in this headless Chrome, even well after paint, so pixels can't be counted there. That leaves the event's documented semantics and the screenshots.
  - Warm WebGPU sequence for survival/typical: `preRender` 72 → `rendered` 79 → `submitted` 79 → `completed` 83 ms. One frame, `isInvalidated = false`. The bench mark landed at 103 ms after BenchStage's double rAF.

## Init vs draw (one-off `performance.mark`s around `SciChartSurface.create`, not shipped)

Dev server, WebGPU, warm browser. The mount and two remounts are `bench:mount` in ms; `create()` is the time from `bench:start` until `create()` resolves.

| chart                     | first mount (create) | remount (create) | remount (create) |
| ------------------------- | -------------------- | ---------------- | ---------------- |
| survival typical (3×200)  | 103 (68)             | 48 (7)           | 44 (2)           |
| survival heavy (6×1000)   | 101 (61)             | 51 (3)           | 64 (3)           |
| survival huge (10×10 000) | 147 (65)             | 84 (8)           | 70 (5)           |
| scatter typical (500)     | 103 (62)             | 46 (2)           | 51 (4)           |
| scatter heavy (10 000)    | 122 (78)             | 52 (3)           | 51 (2)           |
| scatter huge (100 000)    | 152 (64)             | 125 (3)          | 51 (2)           |

- On the first mount, `create()` takes about 60–80 ms: WASM fetch from the HTTP cache, compile and instantiate, the WebGPU device, and the licence check. A remount reuses the shared WASM context, so `create()` drops to 2–8 ms.
- What remains, about 40–90 ms, is building the data series, the first frame and BenchStage's double rAF. It grows only mildly from typical to huge.
- Forced WebGL in a warm browser: first mount 177 ms with `create()` at 117–135 ms, remounts about 45 ms.
- Production preview (`vite preview`): survival typical 169 / 42 / 39, scatter heavy 89 / 45 / 55. The WASM is served from `/assets/`.

Dev numbers only, not comparable with the production benchmark.

The numbers above come from agent-browser's Chrome (WebGPU).

## Bench runner (Playwright Chromium, software WebGL)

One check run against `vite preview`: `BENCH_ARMS=scichart BENCH_SIZES=typical,huge BENCH_REPEATS=3`. Output went to a scratch file, not `results/`. `mountMs` per recorded run:

| chart    | typical       | huge             |
| -------- | ------------- | ---------------- |
| survival | 931, 940, 754 | 2209, 1469, 1471 |
| scatter  | 496, 465, 501 | 1589, 1608, 1842 |

- `naiveMs` is about 25–30 ms below `mountMs`, which is the double rAF.
- Hover `maxFrameMs` was 16.8 everywhere.
- Every attempt is a new page, so each recorded run includes WASM instantiate + `create()`. Most of the gap to the agent-browser numbers is SwiftShader rasterising WebGL on the CPU.
- That favours Canvas/SVG arms over this one in a way real GPU-backed browsers would not. A shared fix would be to launch the runner's Chromium with a hardware GL backend (for example `--use-angle=metal` / headed mode). Not changed here.

## EFFECTS on

- `?embed=display&effects`, survival and scatter: both mount, no page errors, settled (222 / 106 ms).
- With an animation running, the first `isInvalidated = false` frame arrives before the 500 ms animation ends. So in that untimed mode `onSettled` fires mid-animation.

## Updates (both charts and the gallery)

- `SciChartReact` runs `initChart` once per mount and ignores new props. The playground's update step passes a nudged payload to the same component and waits for `onSettled`. Before this change, stacked bar hung there: the lab frame had `bench:settled` for the mount and `play:update-start` with no end. Survival shares the pattern (it also showed `> 60 s`, though that run also had the lab frame scrolled out of view, which stalls measurement on its own).
- Every chart now keys `SciChartReact` on the identity of its data prop (`dataKey` in `surface.ts`). New data remounts the surface, and `onSettled` fires on its first completed frame. A remount reuses the shared WASM context, as uPlot's arm rebuilds on new data. It does not mutate the data series in place.
- Playground (dev, agent-browser Chrome 152, WebGPU): survival typical 95.2 / 49.8 ms, scatter typical 94.8 / 49.3 ms (mount / update).

## Gallery

Support was checked against the installed v6.0.15 types and ESM sources, not docs. Shared code is in `surface.ts`: WASM config and licence, `createSurface` (no titles: axis thickness = MARGIN − 5 px ticks), `fixRange`, `categoryLabels` (`TextLabelProvider` + fixed `majorDelta` = ceil(n / 12), the same thinning as `thinTicks`), `settleOnFirstFrame` and `dataKey`. Category x is the index (−0.5..n−0.5 for bands, 0..n−1 for areas). Y ranges come from the shared `niceScale` / `boxScale` / `candleScale`.

Measured `seriesViewRect` on every cartesian type is 56, 20, 824 × 536, or 788 wide for bar + line, which reserves `COMBO_RIGHT` on the right. That is exact.

| Type | Supported | How | Notes |
| --- | --- | --- | --- |
| Stacked bar | yes | native `StackedColumnCollection` + `StackedColumnRenderableSeries`, `dataPointWidth` 0.8 | Collection animation is a setter, not an option. |
| Stacked area | yes | native `StackedMountainCollection` + `StackedMountainRenderableSeries` | |
| Donut | yes | native `SciChartPieSurface`, `EPieType.Donut` | See donut below. |
| Radar | yes | native `SciChartPolarSurface`, angular + radial `PolarNumericAxis` with `EPolarGridlineMode.Polygons`, `PolarMountainRenderableSeries` | Closed by repeating the first point at x = n. Angular axis `startAngle` π/2 plus `flippedCoordinates` gives 12 o'clock, clockwise (checked with the tooltip). Labels hidden, as in the reference. |
| Bar + line | yes | native `FastColumnRenderableSeries` + `FastLineRenderableSeries` on a second right `NumericAxis` (`yAxisId`) | |
| Heatmap | yes | native `UniformHeatmapRenderableSeries` + `HeatmapColorMap` from `HEAT_RANGE` | Cells start at −0.5 so labels centre on them. y `flippedCoordinates` puts row 0 on top. A flat domain is widened by ±1, as in the ECharts arm. Cells render crisp. |
| Treemap | **no** | | No treemap series or layout anywhere in `scichart` (grep of `types/` and `esm/` for treemap/sankey/squarif: nothing). `FastRectangleRenderableSeries` draws rectangles, but the layout would be ours, which doesn't count. |
| Sankey | **no** | | No sankey series, layout or package. |
| Box plot | yes | native `FastBoxPlotRenderableSeries` + `BoxPlotDataSeries`, outliers as `XyScatterRenderableSeries` | Stats from the shared `boxplotStats`. One series per group so each box gets the group colour (single `fill` per series). `EDataPointWidthMode.Range` with `BOX_RATIO`, cap at the box width. |
| Candlestick | yes | native `FastCandlestickRenderableSeries` + `OhlcDataSeries` | Index x with date labels, as a band scale. |

### Tooltips

- Cartesian types use a native `CursorModifier` with a `tooltipDataTemplate`. Values come from the source data by `dataSeriesIndex`, because stacked series report accumulated y.
  - Stacked bar, stacked area and bar + line show the category and every series, like ECharts' axis trigger.
  - Heatmap shows the row / column and the value from `HeatmapSeriesInfo`.
  - Box plot shows the five statistics only while the pointer is within ±`BOX_RATIO`/2 of a box centre. Pointer y is ignored: the whole column strip triggers it, while the reference hit-tests the box, whiskers and outliers.
  - Candlestick shows the crosshair and OHLC.
- Radar uses the native `PolarCursorModifier`.
- **Donut has no tooltip (deviation).** `SciChartPieSurface` extends `SciChartSurfaceCore`, not `SciChartSurfaceBase`: no `chartModifiers` and no hover API. Its only interaction is click-to-select (it explodes the slice). A hand-written DOM tooltip would not be SciChart's, so none.

### Donut

- The pie is **SVG**, not WebGL: no WASM draw, no watermark, and no `renderInstructionsCompleted`.
  - Settle uses `rendered`, subscribed before `pieSegments.add`, because the add draws synchronously.
  - With `animate` the first `rendered` comes before any slice exists, so the handler waits for a `path`.
  - So `onSettled` fires inside `initChart`. scichart-react keeps an opaque `DefaultFallback` over the chart until `initChart` resolves and `isInitialized` commits. That state update is queued in the same promise chain, ahead of BenchStage's double rAF, so the overlay should be gone before the mark. Not confirmed with pixels.
- The library hard-codes the outer radius to 0.8 × half the view. A per-segment `radiusAdjustment` of 1 / 0.8 and `holeRadius` `INNER_RATIO` / 0.8 restore `donutRadius` (268) and the 0.6 hole.
- **Deviation:** every slice gets a 2 px stroke in the background colour (hard-coded in `drawChart`, no option), so slices show thin white gaps. This is most visible at 60 slices.

### Animation

All types are static unless `EFFECTS`. With `EFFECTS`:
- stacked bar / area, bar + line and radar use `WaveAnimation`;
- heatmap, box plot and candlestick use `FadeAnimation`;
- donut uses `animate: true`.

None has hover emphasis.

### Playground check (dev server, agent-browser Chrome 152 / WebGPU, mount / update ms, median of 5)

| Type | typical | heavy |
| --- | --- | --- |
| Stacked bar | 92.8 / 49.3 | 81.6 / 49.3 |
| Stacked area | 95.8 / 49.4 | 89.7 / 50.2 |
| Donut | 28.9 / 32.8 | 34.4 / 32.8 |
| Radar | 81.7 / 49.5 | 94.9 / 49.5 |
| Bar + line | 91.0 / 49.1 | 99.3 / 49.5 |
| Heatmap | 92.5 / 49.4 | 98.3 / 49.2 |
| Box plot | 95.6 / 49.6 | 123.0 / 64.8 |
| Candlestick | 95.2 / 49.6 | 89.5 / 46.8 |

- Dev numbers, not comparable with the production benchmark.
- The first hover on a fresh display frame twice reported a max frame of 550–600 ms (stacked bar / area typical). Later hovers were 16.7 ms.

### Open points

- Which colour SciChart gives a candle with `open === close` is decided in WASM and was not checked. The reference draws it up (green).
- The first x label on the candlestick axis (index 0) is dropped; SciChart hides a label that would overflow the axis edge.
