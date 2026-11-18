# ApexCharts arm

- apexcharts 8.7.0, react-apexcharts 2.2.0. SVG renderer (the default).
- Tree-shaken: `react-apexcharts/core` plus `apexcharts/line` (registers `line`, `area`, `scatter`, `bubble` and `rangeArea`) and `apexcharts/features/annotations`. No legend, toolbar or other feature modules. The plain `react-apexcharts` import pulls in `apexcharts`, which has every feature.
- Data goes in as-is. Per-series `parsing` maps our objects: `{ x: 'x', y: ['lower', 'upper'] }` for the bands, `{ x: 'x', y: 'y', z: 'size' }` for the bubbles. The line series reads `{x, y}` directly. `parsing` saves us writing the remap, but ApexCharts still does a `.map` over the data inside.

## Both charts

- **900 × 600, MARGIN** — native, with offsets found by measurement: `width`/`height` props, `chart.parentHeightOffset: 0`, and `grid.padding`. ApexCharts sizes the plot itself: it always keeps about 30 px above the grid (title/legend slot) and 5 px below the x labels, and it sizes the y axis from its labels. Pinning `yaxis.labels.minWidth = maxWidth = 30` makes the y-axis width the same on both charts, and `grid.padding` `{ top: MARGIN.top - 31, bottom: MARGIN.bottom - 49, left: MARGIN.left - 30 }` puts the grid at left 56 / top 20 / right 20 / bottom 43.6 (measured from `.apexcharts-grid`'s bounding box). With fixed label width the y title is no longer counted in the axis width and gets clipped at the left edge, so `labels.offsetX: 16` and `title.offsetX: 2` move both back into view. The y axis line and tick marks are off by default; `axisBorder`/`axisTicks` turn them on, with `offsetX: -3` to put the line on the plot edge (it is drawn at 59 px otherwise).
- **Animation off** — native: `chart.animations.enabled: EFFECTS` (covers the initial draw, gradual reveal and dynamic updates). Hover/active filters are set to `'none'` when off. **Not turned off:** the tooltip's CSS fade and slide (`transition: opacity .12s, left .16s, top .16s` in the stylesheet ApexCharts injects). No option controls it; only `prefers-reduced-motion: reduce` does.
- **Axes, ticks, labels, horizontal grid** — native: `xaxis`/`yaxis` with `title.text`, `yaxis.axisBorder`/`axisTicks` on; `grid.xaxis.lines.show: false`, `grid.yaxis.lines.show: true`.
- **Tooltip** — native tooltip with a `tooltip.custom` content callback, see the per-chart notes. The x-axis tooltip badge is off (`xaxis.tooltip.enabled: false`).
- **Colours from `series[i].color`** — native: per-series `color`.
- **No legend** — native: `legend.show: false`, and the legend module is not imported.
- **Toolbar / zoom** — off (`chart.toolbar.show: false`, `chart.zoom.enabled: false`). The spec doesn't need them, and with a numeric x axis ApexCharts turns on drag-to-zoom by default.

## Survival

- **Step-after line** — native: `stroke.curve: 'stepline'`. In `Line.js`, `stepline` draws `H x` then `V y`, which is d3's `curveStepAfter`. `'linestep'` is the opposite (V then H).
- **Confidence band** — native: one `rangeArea` series per arm (chart type `rangeArea`, mixed with `line` series, the documented "range area + line" combo), `stroke.width: 0`, `fill.opacity: 0.15` in a per-series array. The same `stepline` curve applies to both band edges. ApexCharts draws the band as two forward subpaths (upper, then lower) in one path with `fill-rule: evenodd`, which fills exactly the area between them.
- **Censoring ticks** — native (a documented but deprecated option): one point annotation per censored point with `marker.size: 0` and `customSVG: <line y1=-4 y2=4 stroke=color>`, which ApexCharts places translated to the point's (x, y). The built-in marker shapes have no vertical bar (`'line'` is horizontal, `'plus'` adds a horizontal stroke). `customSVG` is in the annotation docs and the runtime defaults, but not in the `.d.ts`, so the arm declares a local type that extends `PointAnnotations` with it (no cast). The source marks `customSVG` as "will be deprecated in the next major version" in favour of `image`. An `image` would need one data-URI SVG per colour, so `customSVG` stays.
- **Axes 0..last x / 0..1, "Days"/"Survival"** — native: `min`/`max`, `yaxis.tickAmount: 5`. **Deviation:** the x ticks are 0, 69, 137, … 412. With a fixed `max` ApexCharts splits the range evenly. `xaxis.stepSize` is ignored unless it divides the range exactly (`Scales.setXScale`), and 412 has no round divisor.
- **Tooltip: pointer x + each series' value** — composed. `tooltip.shared: true, intersect: false` shows the tooltip anywhere over the plot. On a numeric x axis, ApexCharts finds the nearest point in 2D across all series, then reads **the same data index** from every series (`Tooltip/Utils.getNearestValues`). Our series have different x grids, so the built-in rows would be wrong. Using that nearest point's x also misses the pointer: 2D-nearest drifts sideways when the pointer is off the curves. Measured: pointer at day 122 gave "Day 138", day 222 gave "Day 234". No tooltip callback receives the pointer, and `chart.events.mouseMove` fires *after* the tooltip (it listens on the outer wrapper, in the bubble phase). So the arm puts an `onMouseMoveCapture` on react-apexcharts' wrapper div (extra props are spread onto it). The capture phase runs before ApexCharts' listeners. The handler converts the pointer to days from MARGIN and stores it in a ref, and `tooltip.custom` bisects each arm (d3 `bisector`) at that x. Checked: pointer at 300/302/306/500 px gave Day 122/123/125/222, and the values match a direct lookup in the generated data. **Deviation:** ApexCharts' x crosshair snaps to that same nearest point (23 px off the pointer at 500 px), so `xaxis.crosshairs.show: false`. No hover line.

## Scatter

- **Circle radius = `point.size`, 70% opacity** — native: chart type `bubble` with `plotOptions.bubble.zScaling: false`, so the radius is `z` exactly (`Scatter.js`: `radius = seriesZ[i][j]`, divided by `zRatio` only when scaling is on). Checked in the DOM: the first three points of Group 1 have size 5, 6, 6 and arc radii 5, 6, 6. `fill.opacity: 0.7`. Bubbles get a white 2 px outline by default, so `markers.strokeWidth: 0`.
- **Nice linear axes, "X"/"Y"** — y: native (ApexCharts nice-scales the y axis by default: 0..100). x: composed. ApexCharts does not round a numeric x axis: it starts at the data minimum (3, 16, 30, …), and `stepSize` keeps that minimum. So the arm takes the domain and tick count from d3 `scaleLinear().nice()` and passes them as `min`/`max`/`tickAmount` (0..90 in steps of 10).
- **Tooltip: nearest point's series id and x, y** — native: `shared: false, intersect: false` → ApexCharts's nearest point in 2D (`closestInMultiArray`), with content from `tooltip.custom`. Checked: hovering the first point shows `Group 1: (28.5, 47.7)`.

## Casts

- None. `!` is used twice in the scatter tooltip (`series[seriesIndex]!`, `points[dataPointIndex]!`) because of `noUncheckedIndexedAccess`.

## Gotchas

- `react-apexcharts` creates the chart in `useEffect` (`new ApexCharts(el, opts).render()`). It deep-compares `options`/`series` on every render and calls `updateOptions` when they change, so both are memoised. The settle callback is captured once in a `useState` initialiser: the page wrappers pass a fresh `onSettled` closure each render, which would otherwise rebuild `options` and trigger a full `updateOptions` redraw.
- With a numeric x axis, drag-to-zoom is on by default and the toolbar shows up unless `chart.toolbar.show: false`.
- The default `react-apexcharts` entry imports the full library. The `/core` entry needs each chart type and feature imported by hand. A feature you use but didn't import fails with only a console warning (`warnMissingFeature`).
- Shared tooltip + numeric x + different x per series: values are paired by index (above).
- Fixed `xaxis.max` + `stepSize` that doesn't divide the range: `stepSize` is silently dropped.
- Per-point SVG: every bubble is its own `<path>` (505 at typical, 10,005 at heavy, 100,005 at huge: one per point plus a hidden hover marker per series), and every censor tick is its own `<g>` (468 at heavy, 7,896 at huge). `chart.dataReducer` (LTTB) is off by default, so every point is drawn. Checked: each heavy line path has 999 `H` segments, each huge one 9,999. `markers.largeDatasetThreshold` (off by default) would merge markers into one path per size but drops per-marker hover; not used.

## Settle mode: `signal`

- Hook: `chart.events.mounted`, guarded to call `onSettled()` once, plus `chart.events.updated` for the playground's update step (see Gallery → Settle). `render()` builds the whole SVG (grid, series, annotations, axes, tooltip DOM) synchronously inside `mount()`'s promise executor. `mounted` fires in that promise's `.then`, a microtask after the drawing, with no rAF or timer in between. `react-apexcharts` calls `render()` from `useEffect`, so `raf` mode would mark before the chart exists. With animations off, `animationEnd` adds nothing; `updated` fires only on later updates.
- Evidence (typical, dev server, agent-browser): I wrapped `requestAnimationFrame` and installed a `MutationObserver` on `#root` before `benchStage.mount()`. The first rAF, requested by `BenchStage.requestSettle` ← `settled` (ArmPage) ← `mounted` (charts.tsx), saw the finished chart:
  - survival: **12 series paths** (3 bands, 3 lines, their hidden markers), **47,050 characters** of band and line `d`, and **48 censor-tick groups**.
  - scatter: **505 bubble paths**.
  
  The observer recorded **2 mutation batches in total** on each chart. The last one came at or before that rAF (survival 60.5 / 60.6 ms, scatter 207.5 / 207.5 ms). Nothing in the DOM changed after `mounted`. At heavy and huge the node counts after settle match the data (Gotchas).

## Dev-mode mount times (`bench:mount`, ms, one value per page load, Vite dev server, headless Chromium via agent-browser)

| chart | typical | heavy | huge |
| --- | --- | --- | --- |
| survival (3×200 / 6×1000 / 10×10 000) | 33–191 | 198, 509 | 7020, 9225 |
| scatter (500 / 10 000 / 100 000) | 26–132 | 277, 405 | 6164, 3978 |

Dev numbers only; not comparable to the production benchmark.

## Gallery

Files: `gallery/<type>.tsx`, all `settleMode: 'signal'`. Shared setup in `shared/base.ts` (also used by `charts.tsx`): `useBaseOptions` (settle hook, animation/hover off, no legend/toolbar, grid padding), `useGalleryOptions` (adds solid fill at opacity 1; bars default to 0.85 and areas to a gradient), `categoryX` (category axis with labels thinned by `shared/ticks.thinTicks` through `labels.formatter`, upright), `categoryTooltipX` (tooltip title from the category, because the title otherwise goes through the thinned label formatter and comes out empty).

Each chart imports only its type entry (`apexcharts/bar`, `area`, `donut`, `radar`, `heatmap`, `treemap`, `boxPlot`, `candlestick`; combo imports `bar` + `line`). No console warnings about missing features.

| type | supported | how |
| --- | --- | --- |
| stacked-bar | yes, native | `chart.type: 'bar'`, `chart.stacked: true`, `columnWidth: '80%'` (band padding 0.2). Tooltip per segment (`intersect: true`): category, series, value. |
| stacked-area | yes, native | `chart.type: 'area'`, `stacked: true`, `stroke.curve: 'straight'`, 1 px stroke, solid fill. `tickPlacement: 'on'` so the first and last points sit on the plot edges. Shared tooltip: category plus every series. |
| combo | yes, native | Mixed series: `type: 'column'` + `type: 'line'` on chart type `line`, two y axes tied with `seriesName`, the second `opposite: true`, both `min: 0`. Line width `COMBO_LINE_WIDTH`, no markers. Shared tooltip. |
| donut | yes, native | `chart.type: 'donut'`, `donut.size: '60%'` (`INNER_RATIO`), per-slice `colors`, no slice labels, `expandOnClick: false`, stroke 0. Starts at 12 o'clock, clockwise (ApexCharts' default). Tooltip: slice and value. |
| radar | yes, native | `chart.type: 'radar'`, `plotOptions.radar.size` = `radarRadius`, `yaxis` 0..`radarMax` with `tickAmount: RADAR_RINGS`, grey polygons and spokes, no fill between rings, category names hidden (as in the reference). Fill 0.2, stroke 2. Tooltip per point (`intersect: true`): category, series, value. |
| heatmap | yes, native | `chart.type: 'heatmap'`, one series per row (reversed, so `ys[0]` is the top row), `radius: 0`, `enableShades: false`, stroke 0. Colour: see below. Tooltip: `row: column = value`. |
| treemap | yes, native | `chart.type: 'treemap'`, one series per top-level group, leaves via `shared/treemap.treeLeaves`, per-leaf `fillColor` from `treemapRamp`. `borderRadius: 0`, `seriesTitle.show: false` (it draws a label plate per group otherwise), stroke 0. ApexCharts' own squarified layout. Tooltip: leaf and value. |
| boxplot | yes, native | `chart.type: 'boxPlot'` with the five numbers from `shared/boxplot.boxplotStats` (`[whiskerLow, q1, median, q3, whiskerHigh]`), per-box `fillColor`, `stroke.colors: [BOX_STROKE]`, `columnWidth: '60%'`. Outliers: the datum's `points` array with `plotOptions.boxPlot.points` (`jitter: 0`, radius 2, `#333`, `maxPoints: Infinity`). ApexCharts draws `points` as observation dots; with a precomputed `y` it draws exactly the points given and does not need `features/stats`. y axis from `boxScale`. Tooltip: ApexCharts' five-number box. |
| candlestick | yes, native | `chart.type: 'candlestick'` on a category x axis (the dates as strings, so weekends leave no gaps), `colors.upward/downward` = `CANDLE_UP/DOWN`, `wick.useFillColor`, `columnWidth: '60%'`, stroke 1. y axis from `candleScale`. Shared tooltip (`intersect: false`), so it snaps to the nearest candle: ApexCharts' OHLC box. |
| sankey | **no** | The `apexcharts` package has no Sankey type or entry point (none in `src/entries`, `src/charts` or the types). The only mention is a `.d.ts` comment listing `apexsankey` as a sibling product. `apexsankey` is a separate npm package (1.14.0, `SEE LICENSE IN LICENSE.md`, a commercial licence shared with the ApexCharts family keys), so under the brief's "a separate paid product does not count" it is not supported. If the README's "a published package provides it" is read to include commercial packages, `apexsankey` would qualify. |

### Layout (measured from `.apexcharts-grid` / `.apexcharts-pie` at 900 × 600)

- **Axis charts** (stacked-bar, stacked-area, heatmap, boxplot, candlestick): grid at exactly left 56 / top 20 / right 20 / bottom 44.
- **Boxplot right edge**: when the last x label is visible and wider than twice the right padding ("Group 8" at typical), ApexCharts widens the grid's right pad by half the label width (`XAxis.uprightLabelsRightPad`), which put the right edge at 857 instead of 880. The only switch that turns this off is `xaxis.labels.trim`, which also truncates labels wider than their slot ("G…" when thinned at heavy). So `trim` is on only when `thinTicks` keeps every label. Measured: typical and heavy both land on MARGIN, with every label intact. Same pinned 30 px y labels as survival. Without an x-axis title ApexCharts gives the x labels about 11 px less height, so `GALLERY_PADDING.bottom` is `MARGIN.bottom - 37.7` (survival's `- 49` includes the title). Checked at typical and heavy.
- **Combo**: left 56 / right 56 (`COMBO_RIGHT`). With a second y axis on the right, the left axis needs +28 px of padding and the right one `COMBO_RIGHT - 58`, both found by measurement.
- **Radar**: `plotOptions.radar.size` sets the radius exactly. The grid padding offsets (`top - 31`, `bottom - 5`) put the grid on MARGIN, so the centre is (468, 287.5), checked from the series group's `translate`.
- **Treemap**: ApexCharts keeps 21 px above the treemap even with `seriesTitle` off. `padding.top: MARGIN.top - 21` puts the tiles on MARGIN exactly.
- **Donut**: grid padding behaves differently for circle charts. The grid is a `min(width, height)` square centred in the SVG with the padding taken out of it, and the radius is `gridSize / 2.05 - dropShadow.blur`. Padding `{ left: 50, right: 14, top: 20, bottom: 44 }` makes that square exactly the 536 px plot height centred on (468, 288). `chart.dropShadow.blur: 0` drops the 4 px blur term, and `customScale = 2.05 · donutRadius / 536` (1.025) scales the radius to 268. Measured: the pie's bounding box is 536 × 536 at left 200 / top 20, so the centre is (468, 288).

### Colour

- **Heatmap**: per-cell colour is the shared `heatmapRamp`, but `HeatMap.js` only calls `fill.fillPath` (which honours a datum's `fillColor`) for image fills. Cells take their colour from `colorScale`, so the arm passes one range `{ from: v, to: v, color: ramp(v) }` per distinct value. Checked: all 400 typical cells have `fill === heatmapRamp(val)`, and the top-left cell is `values[0][0]`. **Ceiling:** ApexCharts scans the ranges once per cell, so the cost is cells × distinct values: 400 × ≤101 at typical and 10,000 × ≤101 at heavy (integer data, fine). Float data with many distinct values would be quadratic; binning the ramp into a fixed number of ranges would be the fix.
- **Treemap**: per-leaf `fillColor` is honoured (`Treemap` → `Fill.fillPath` with `dataPointIndex`).
- **Boxplot**: per-box `fillColor` overrides both box halves (`lower`/`upper` colours), so each box is one colour. The median is the shared edge of the two halves, stroked `BOX_STROKE`.

### Deviations

- **Candlestick: flat candles (open = close, 11 of 250 at typical) are red, not green.** ApexCharts picks `upward` only when `o < c` (`BoxCandleStick.drawBoxPaths`), and the wick/border colour comes from that choice, not from a datum's `fillColor`. Shared `isUp` treats flat as up.
- **Candlestick tooltip has no date line**: ApexCharts' default OHLC box shows only Open/High/Low/Close.
- **Boxplot tooltip shows raw quartiles** (e.g. `Q1: 42.150000000000006`): ApexCharts prints the five-number values unformatted.
- **Candlestick: no x tick marks.** With 5,000 categories they merge into a solid grey band, so `axisTicks.show: false`.
- **Heatmap: the y axis draws one tick below the last row**, an ApexCharts category-tick artefact.
- **Tooltip fade** is not turned off when effects are off (same as survival/scatter).

### Settle

- Same `chart.events.mounted` hook as survival/scatter. Checked at heavy by counting `[data-bench-stage] *` when `bench:settled` is marked and again 4 s later. They matched on every type: stacked-bar 1,901, donut 986, radar 433, heatmap 12,240 (10,003 rects), treemap 5,833, boxplot 326, stacked-area 3,223, candlestick 20,077, combo 2,119.
- **Updates:** `chart.events.updated` now also calls `onSettled`. Before this, the playground's update step (`mode: 'update'`, `updateSettle: 'signal'`) waited for a settle that never came, because `mounted` fires only once. Every apex Render, survival included, sat in warm-up until the 60 s timeout. `updated` fires in `updateOptions`' `mount().then`, after the redraw, which mirrors `mounted`. This applies to `charts.tsx` too.
