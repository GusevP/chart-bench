# Highcharts arm

- highcharts 13.1.1, highcharts-react-official 3.2.3 (named export `HighchartsReact`; the default import resolves to the CJS module object under Vite and React throws "Element type is invalid").
- Modules: `highcharts/highcharts-more` (for `arearange`) and `highcharts/modules/boost`, imported as side effects after core, as the docs show. SVG renderer, with WebGL through boost for large series.
- No accessibility module. Highcharts logs a console warning on every mount suggesting it; left as is.
- Credits link ("Highcharts.com", bottom right) kept at its default.

## Boost

The docs recommend the boost module for large datasets, so a docs-following app with 100k-point scatters would load it. It is loaded with its defaults, and the same config is used at every size.

- **Thresholds:** `boostThreshold` defaults to 5000 points **per series**. When more than 5 series need boost, or when every series is boostable and needs it, the whole chart is boosted (`isChartSeriesBoosting`). Boosting the whole chart pulls the small series in too.
- **Where it engaged:**

| size | survival (points per series) | scatter (points per series) |
| --- | --- | --- |
| typical | 200: SVG | 100: SVG |
| heavy | 1000: SVG | 2000: SVG |
| huge | 10 000: **boosted**, whole chart | 20 000: **boosted**, whole chart |

- **How engagement was checked:** at huge, `.highcharts-series-group` has no paths or markers, and the plot is a single SVG `<image>` whose `href` is a PNG data URL rendered from the WebGL canvas. At typical and heavy, every path and marker is SVG.
- **What boost changes, seen at huge:**
  - **Band:** `arearange` is drawn in `LINES` mode, as one thin vertical line per point at 15 % alpha. It reads as a hatched band rather than a filled step area.
  - **Censor ticks:** the custom `vline` symbol has no WebGL texture, so ticks become filled circles of radius 4 in the series colour. At 10k points they smear into a thick line.
  - **Scatter radii:** boost takes point size from the series `marker.radius`, so per-point `marker.radius` is ignored and every point is drawn at the default radius of 4.
  - **Scatter opacity:** the 70 % alpha survives because it is in `marker.fillColor`. Boost ignores the series `opacity` option, which is why that option is not used.
  - **Console warning:** boost logs "Highcharts warning #12" once on the huge scatter because it wants array data, and per-point radius needs object points.
  - **Tooltips:** still work. The survival tooltip showed all 10 series at Day 9636. The scatter tooltip showed "Group 2: (37.4, 53.4)". There are no hover markers, but hover states are off anyway.

## Both charts

- **900 × 600, MARGIN:** native. `chart.width`/`height` plus `chart.margin: [top, right, bottom, left]` fix the plot box exactly. Axis titles are nudged up with `title.y: -6`; otherwise the x title sits partly below 600 px.
- **Animation off:** native. `chart.animation`, `plotOptions.series.animation` and `tooltip.animation` are all set to `EFFECTS`.
- **Hover effects off:** native. `plotOptions.series.states.hover.enabled` and `states.inactive.enabled` (Highcharts' dim-the-others) are set to `EFFECTS`. With hover on, the line thickens and a marker appears in the default cycling symbol (a triangle for the second series).
- **Axes, ticks, labels, horizontal grid:** native. The y axis has grid lines by default; the x axis has none. The y axis has no axis line or ticks by default, so `lineWidth: 1, tickWidth: 1` are set.
- **Colours:** native, from per-series `color`.
- **No legend:** native, `legend.enabled: false`. The default title "Chart title" is removed with `title.text: undefined`.

## Survival

- **Step-after line:** native, `step: 'left'` with `[x, y]` arrays.
- **CI band:** native. An `arearange` series with `[x, lower, upper]`, `step: 'left'`, `fillOpacity: 0.15`, `lineWidth: 0`. No reshaping beyond the tuple.
- **Censor ticks:** composed. A custom marker symbol `vline` is registered on `Highcharts.SVGRenderer.prototype.symbols`, the documented custom-marker extension point. It draws a vertical path over the marker box, so `radius: 4` gives ±4 px. It is used by a `scatter` series of the censored points with `lineWidth: 1, lineColor: s.color`. The default marker `lineColor` is white, so it must be set. Under boost these become dots (see above).
- **Axes 0..last x / 0..1, "Days"/"Survival":** native, `min`/`max` and `title.text`.
- **Tooltip:** composed. `tooltip.shared: true`, with band and tick series excluded by `enableMouseTracking: false`.
  - Shared mode gives each series its *nearest point by x*, not the step value at that x, so near a drop it would show the value after the drop.
  - A `tooltip.formatter` takes the hovered x (`this.x`) and binary-searches each series for the last point at or before it.
  - Deviation: the x shown is the nearest data x among the series (Highcharts snaps to points), not the raw pointer x.
  - Checked in the browser: "Day 198 / Arm A: 0.736 / Arm B: 0.751 / Arm C: 0.738".

## Scatter

- **Radius = `point.size`, 70 % opacity:** native.
  - Points are objects `{x, y, marker: {radius}}`.
  - `marker.symbol: 'circle'` is required, because the default symbol cycles per series (circle, diamond, square…).
  - Opacity comes from `marker.fillColor` set to `Highcharts.color(c).setOpacity(0.7).get()`.
  - Deviation at huge only: boost draws a uniform radius (see Boost).
- **Nice axes "X"/"Y":** native. The y axis ends on ticks by default; the x axis needs `startOnTick`/`endOnTick: true`.
- **Tooltip:** native. Scatter's default `findNearestPointBy: 'xy'`, with `headerFormat: ''` and a `pointFormat` of `{series.name}: ({point.x:.1f}, {point.y:.1f})`. Checked: "Group 3: (39.0, 51.2)".

## Casts

- None. `points[mid]!` is the only non-null assertion, needed under `noUncheckedIndexedAccess`.

## Gotchas

- **Per-point options above 1000 points:** `turboThreshold` (default 1000) matters. Above it, Highcharts' turbo path keeps only `x`/`y` from array data. So `keys: ['x', 'y', 'marker.radius']` with arrays would silently drop the radius at heavy (2000 points per series). Object points avoid that.
  - In v13, object data above the threshold falls back to the slow path with no error.
  - Boost still warns (#12).
- **Accessibility warning:** logged on every chart unless `accessibility.js` is loaded or `accessibility.enabled: false` is set.
- **Re-renders:** the wrapper runs `Highcharts.chart()` in `useLayoutEffect` and `chart.update()` whenever the `options` identity changes, so options are memoised.

## Settle mode: `signal`

- **Hook:** `chart.events.render` calls `onSettled` (see *Settle: `render`, not `load`* below). `Chart.firstRender()` calls `render()` and then, synchronously, `onload()`, which fires `load` once and then `render`. All of this happens inside the wrapper's `useLayoutEffect`.
- **Boost:** in this run boost had blitted its WebGL canvas into the SVG `<image>` before `load`.
  - The source does have deferred paths: `WGLRenderer.render` retries with `setTimeout(1)` if the shader is not ready, and the k-d tree for hover is built in rAF chunks.
  - Only the k-d tree is deferred in practice. It is hover data, not pixels.
- **Evidence:** in a real browser (agent-browser, Vite dev), `requestAnimationFrame` was wrapped. On the call from `BenchStage.requestSettle`, made in the same tick as `onSettled`, the probe recorded the plot DOM, then recorded it again 1–3 s later:

| run | at `onSettled` | later |
| --- | --- | --- |
| survival typical | 60 paths, 48 markers | same |
| scatter typical | 500 paths, 500 markers | same |
| survival heavy | 492 paths, 468 markers | same |
| scatter heavy | 10 000 paths, 10 000 markers | same |
| survival huge (boost) | 0 paths, `<image>` href of 276 866 chars | same |
| scatter huge (boost) | 0 paths, `<image>` href of 213 154 chars | same |

## Dev-mode mount times (`bench:mount`, ms, Vite dev, headless Chromium, single runs)

| chart | typical | heavy | huge |
| --- | --- | --- | --- |
| survival | 38 | 96 | 722 |
| scatter | 44 | 146–172 | 260–1340 (three runs, noisy) |

Dev numbers only; not comparable to the production benchmark.

## Gallery

All ten types are native Highcharts series; none is composed from custom paths or shapes. Each file imports only the modules its type needs, as side effects after core (the same pattern as `charts.tsx`). Shared options live in `shared/options.ts` (kept out of `gallery/`, which the gallery page globs as chart types).

| type | series | modules | boost |
| --- | --- | --- | --- |
| stacked-bar | `column`, `stacking: 'normal'` | core | no |
| stacked-area | `area`, `stacking: 'normal'` | core | no |
| donut | `pie` with `innerSize` | core | no |
| radar | `area` on a `chart.polar` pane, `gridLineInterpolation: 'polygon'` | `highcharts-more` | no |
| combo | `column` + `line` on a second, `opposite` y axis | core | no |
| heatmap | `heatmap` + `colorAxis` | `modules/heatmap`, `modules/boost` | **yes at heavy** |
| treemap | `treemap`, `layoutAlgorithm: 'squarified'` | `modules/treemap` | no (see below) |
| sankey | `sankey` | `modules/sankey` | no |
| boxplot | `boxplot` + `scatter` for outliers | `highcharts-more` | no |
| candlestick | `candlestick` in a plain `Highcharts.chart` | `modules/stock` | no (not boostable) |

### Settle: `render`, not `load`

- `chart.events.render` calls `onSettled`. It fires after the first render (right after `load`) and after every redraw, so it also ends update runs: the wrapper's `chart.update()` redraws but never fires `load` again.
- With `load`, the playground's update phase never settles and every run times out at 60 s. `charts.tsx` used `load` at first: survival typical timed out in the playground, with the mount result arriving and the update result never arriving. It uses `render` now too.
- Boosted heatmap at heavy: the plot `<image>` (80 946-char PNG data URL) is already in place when the mount result is posted, and unchanged 2 s later. Only the mount path was probed.

### Boost

- Points per series at heavy against the default `boostThreshold` of 5000 (`>=`): heatmap 10 000, treemap 5050, candlestick 5000, everything else far below. The boostable types are area, arearange, column, bar, line, scatter, heatmap, bubble and treemap. Candlestick is not one of them.
- **Heatmap:** boost loaded. At heavy it engages: no cell rects, a single `<image>`. It looks the same as SVG, and the tooltip still works ("Y49 / X49 49").
- **Treemap:** boost not loaded. With it, heavy (5050 points) was boosted and lost its tooltip entirely, and boost drew a 1 px border round every leaf (the WebGL renderer forces `swidth || 1`). Without it, 5050 SVG rects, tooltip working, mount about 70 ms in dev.

### Common

- **Size and plot box:** `chart.width`/`height` and `chart.margin` from `MARGIN`; combo uses `right: COMBO_RIGHT`. Donut and radar size the pie/pane in pixels from `donutRadius`/`radarRadius`, centred in the plot box.
- **Effects:** as for survival/scatter (`animation`, `states.hover`, `states.inactive` set to `EFFECTS`). Checked with effects off: hovering a stacked bar shows the tooltip with no dimming or highlight.
- **No legend, no title, credits kept.** Highcharts' own default per-point tooltips, except where noted.
- **Category axes:** `tickPositions` from `thinTicks`. Labels use `rotation: 0`, `overflow: 'allow'` and `whiteSpace: 'nowrap'`. Without those, the 10-character candlestick dates were cut to "2020-01-…", and 40 boxplot groups were rotated -45° and clipped by the 44 px bottom margin.
- **Value axes:** axis line and ticks on; `reversedStacks: false`, because Highcharts otherwise stacks the first series on top, the reverse of the reference.
- **Bars:** `borderWidth: 0`, `borderRadius: 0` (the defaults are a white 1 px border and 3 px rounding). `groupPadding` is set so the bar or box takes the reference's share of the band: 80 % for bars, `BOX_RATIO` and `CANDLE_RATIO` for boxes and candles.

### Per type

- **stacked-area:** `pointPlacement: 'on'`. Without it a category axis pads half a category at each end (Axis `minPointOffset`), so the area does not reach the plot edges. Shared tooltip.
- **donut:** `startAngle: 0` is 12 o'clock, clockwise. Data labels off (they shrink the pie). The tooltip reads "Slice 1 / Series 1: 33"; the series has no name in the data.
- **radar:** `pointPlacement: 'on'`, which the spider-web pattern needs so points sit on the spokes. Rings are `tickPositions` `[0, ...radarRings(max)]`. Category and ring labels are hidden, as in the reference. Shared tooltip.
- **combo:** both y axes have `min: 0`. **Deviation:** Highcharts' default `alignTicks` lines up the two axes' ticks, so the left axis can end on a non-nice max (64 for typical data where the bars peak at 50). Shared tooltip.
- **heatmap:** `[x, y, value]` arrays, so the turbo path keeps them at 10 000 points. The y axis is reversed, so the first row is at the top. The colour axis uses `minColor`/`maxColor` from `HEAT_RANGE`, with min/max from `heatmapDomain`; a flat domain is widened by ±1, as in the ECharts arm. The tooltip formatter shows "row / column" and the value. **Deviation:** the x axis line is off, while the y axis keeps its line and ticks.
- **treemap:** points are flattened to `{id, parent}`, with groups transparent and leaves coloured by `treemapRamp`. Data labels off, borders 0, `allowTraversingTree: false`.
- **sankey:** `nodeWidth`, `nodePadding` and `linkOpacity` come from shared/sankey, and node colours from `sankeyColors`. Links take their source node's colour by default. Data labels off, node border and rounding off. **Deviation:** Highcharts has no layout-iterations option, so `ITERATIONS` is unused. It assigns columns by link depth and centres shorter columns vertically.
- **boxplot:** Highcharts takes precomputed `low/q1/median/q3/high`, so `boxplotStats` supplies them. The stroke is the series `color`/`lineWidth`, the fill is per-point `fillColor`, and `whiskerLength: '100%'` matches the reference. Outliers are a `scatter` series with `enableMouseTracking: false`, because otherwise a pointer in the gap between two boxes got the outlier scatter's raw `x: 1, y: 52.9` tooltip. **Deviation:** outliers have no tooltip of their own. Box tooltip values use `valueDecimals: 2`.
- **candlestick:** `modules/stock` registers the series. A plain `Highcharts.chart` is used, because `stockChart` would add a navigator, range selector, scrollbar, ordinal axis and data grouping. `dataGrouping.enabled: false` is set explicitly; outside `stockChart` it already defaults off (`enabled ?? chart.options.isStock`). At heavy, all 5000 candles are drawn as 5000 paths. Highcharts counts `open === close` as down; the shared rule counts it as up, so flat candles get per-point `color`/`lineColor`. **Deviation:** the twelve 10-character date labels are as wide as their slots, so at typical and heavy neighbours touch and sometimes overlap by a pixel or two.

### Dev-mode playground numbers (Render, Vite dev, headless Chromium, mount / update ms)

| type | typical | heavy |
| --- | --- | --- |
| stacked-bar | 19.0 / 33.7 | 23.1 / 27.7 |
| stacked-area | 19.1 / 33.2 | 43.2 / 55.5 |
| donut | 17.4 / 32.9 | 18.5 / 33.7 |
| radar | 22.1 / 34.2 | 23.6 / 32.8 |
| combo | 20.5 / 32.9 | 28.5 / 33.2 |
| heatmap | 30.4 / 32.8 | 51.0 / 52.8 (boosted) |
| treemap | 20.1 / 32.4 | 69.9 / 91.0 |
| sankey | 18.7 / 33.0 | 15.4 / 34.9 |
| boxplot | 18.2 / 31.9 | 34.2 / 28.2 |
| candlestick | 19.1 / 32.8 | 55.0 / 81.2 |
