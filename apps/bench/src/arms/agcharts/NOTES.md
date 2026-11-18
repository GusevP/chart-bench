# AG Charts arm

- ag-charts-community 14.3.0, ag-charts-react 14.3.0 (`AgCharts` component). Community edition only.
- Modular registration: `ModuleRegistry.registerModules([LineSeriesModule, AreaSeriesModule, BubbleSeriesModule, NumberAxisModule])`. No `AllCommunityModule`, no Legend module.
- Enterprise-only in 14.3 (checked in the community bundle's module table, `enterprise: true`): `range-area`, `animation`, crosshair-style extras. So the band is composed and there is no animation to turn off.
- No watermark and no console licence message in Community: the licence manager only exists when the Enterprise package registers one. Console was clean on every run (typical, heavy, huge, both charts).

## Both charts

- **900 × 600, MARGIN**: native. Options `width`/`height`; chart `padding: { top: 20, right: 20, bottom: 0, left: 0 }`, `seriesArea.padding: 0`, and axis `thickness` (x 44, y 56) give the plot area exactly MARGIN. Gotcha: with a fixed `thickness`, AG drops the axis title silently when labels plus the default title spacing don't fit. `title.spacing: 4` makes "Days"/"Survival"/"X"/"Y" fit.
- **Animation off**: native, by absence. Animation is an Enterprise module, so Community never animates (no grow-in either). With `EFFECTS` off, `highlight: { enabled: false }` also turns off the hover highlight. With it on, the default single-item highlight is used. There is no Community animation to turn on.
- **Axes, ticks, labels, horizontal grid**: native. `number` axes with `title`; x `gridLine.enabled: false` keeps the y grid only.
- **Tooltip**: native (DOM tooltip, `.ag-charts-tooltip`), see per chart.
- **Colours from `series[i].color`**: native (`stroke`/`fill` + `fillOpacity`).
- **No legend**: native. Legend module not registered.

## Survival

- **Step-after line**: native. Line series `interpolation: { type: 'step', position: 'end' }`. `'end'` puts the vertical at the end of each segment, which is d3's `curveStepAfter`. `marker.enabled: false`, because line markers are on by default.
- **Confidence band**: composed. `range-area` is Enterprise, so each band is two stacked area series in their own `stackGroup` (the series id): a transparent `lower` area and a `upper − lower` area on top of it at `fillOpacity: 0.15`. Both use step interpolation. This needs a derived `band{i}` key.
- **Censoring ticks**: native/composed. One more line series per arm on key `c{i}` (set only on censored rows), `strokeWidth: 0`, with a custom marker shape function (`AgMarkerShapeFn`, the documented custom-marker hook) that draws a ±4 px vertical stroke.
- **Axes 0..last x / 0..1, "Days"/"Survival"**: native. `min`/`max` + `nice: false`.
- **Tooltip: pointer x + each series' value**: native, with a data reshape. `tooltip.mode: 'shared'` groups series by *identical* x value (it is meant for category data), and our series have different x grids. So `toWide` builds one chart-level dataset over the union of all x values, forward-filling each series' `y`/`lower`/`band` (the step-after value), with keys left out before a series' first and after its last point. The renderer returns heading `Day {x}` and one `{label: id, value}` row per series.
  - The x shown is the nearest data x in the union grid, not the exact pointer x. With integer days the difference is under one day.
  - Gotcha: the area series' fills win the pointer pick (area picks by axis first, then by exact shape, distance 0) over the nearer line node. If those series have `tooltip.enabled: false`, the pick is then filtered out and **no tooltip shows at all**. A numeric `tooltip.range: 0` doesn't help either, because the exact-shape pick has distance 0. Fix: band and tick series keep tooltips on, with a renderer that returns an empty `data` row (`silent`). The shared group then lists the line series. Checked by hovering inside bands away from the lines at three x positions: "Day 123/174/353" with all three arms each time.

## Scatter

- **Circle radius = `point.size`, 70% opacity**: native. Bubble series with `sizeKey: 'size'`, `sizeDomain: [0, max]`, `minSize: 0`, `maxSize: 2·max` (default `sizeMode: 'diameter'`, linear), so diameter = 2·size. A scatter series would need a per-point `itemStyler` for the size.
- **Every point drawn**: bubble's `maxRenderedItems` defaults to 2000 and aggregates anything above that (huge has 20 000 per group). It is set to `s.points.length`. `Infinity` is rejected with a console warning and the default stays.
- **Nice linear axes, "X"/"Y"**: native. Number axis `nice` default (typical: 0..100 both; huge: −50..150 × 0..120).
- **Tooltip: nearest point's series id and x, y**: native. Default nearest pick; the renderer returns a `x, y` row and the series title shows as the item title ("Group 4 / x, y / 41.7, 48.3").

## Casts

- None. Only `as const` on the interpolation literal. `!` is used for `cursors[i]!`, `pts[c + 1]!` and `pts.at(-1)!` under `noUncheckedIndexedAccess`.

## Gotchas

- Data shape: AG wants one wide, category-aligned dataset for shared tooltips. We have long per-series data, so the survival arm reshapes it (union x, forward fill). This runs inside `useMemo`, so it counts in mount time.
- Fixed axis `thickness` hides titles silently (above).
- Tooltip-disabled series still take the pointer pick and blank the tooltip (above).
- Default `maxRenderedItems: 2000` on scatter/bubble aggregates large data without saying so.
- Line series markers default to on. Leaving them on would draw 10 × 20 000 markers at huge.
- ag-charts-react creates the chart in `useLayoutEffect` and calls `update()` whenever the `options` identity changes, so options are memoised.
- Update settle: the playground's update pass sends new data with the same `onSettled` identity, so `useSettle` takes `options` as a dependency and calls `waitForUpdate()` again after each options change. Keyed on `onSettled` alone, the update never settled and the playground sat in warm-up (seen on stacked bar before the fix).

## Settle mode: `signal`

- Hook: `AgChartInstance.waitForUpdate()`, documented as "resolves once any pending changes have been rendered". The instance comes from the `AgCharts` forwarded ref. The wrapper creates the chart in a layout effect and exposes it via `useImperativeHandle`, so the ref is set when the parent's passive `useEffect` runs. `.then(onSettled)`; BenchStage dedupes repeat calls.
- Evidence: in agent-browser (dev server) I wrapped `requestAnimationFrame` and, on each call, counted non-white pixels of the chart canvas with `getImageData`, logging the caller. Alpha is useless here because AG paints an opaque white background, so every pixel is opaque. A MutationObserver also counted the canvas pixels the moment it was inserted.
  - survival/typical: canvas inserted at 600×300 with **0** ink. The first rAF, from BenchStage `requestSettle` ← `settled` (our `.then`), saw **73,951 / 540,000** non-white pixels at 900×600.
  - scatter/typical: **0** at insertion, then **51,259 / 540,000** at the settle rAF.
  - AG itself made no rAF calls during the first render: the only rAFs logged were BenchStage's two.

## Dev-mode mount times (`bench:mount`, ms, mount + 2 remounts, Vite dev server, headless Chromium via agent-browser)

| chart | typical | heavy | huge |
| --- | --- | --- | --- |
| survival (3×200 / 6×1000 / 10×10 000) | 124, 123, 80 | 274, 124, 135 | 855, 622, 714 |
| scatter (500 / 10 000 / 100 000) | 118, 70, 53 | 300, 185, 137 | 1600, 1471, 1114 |

Dev numbers only; not comparable to the production benchmark.

## Gallery

Files in `gallery/`; `useSettle` and the cartesian `base` options moved from `charts.tsx` to `shared.ts` so the survival/scatter arm and the gallery share them (code-tokens counts `shared.ts` as adapter for both). Settle is `signal` via `waitForUpdate()` for every type. Checked in agent-browser by hooking the iframe's `requestAnimationFrame`: at the first BenchStage settle rAF the 900×600 canvas had 222,487 (stacked bar), 263,492 (stacked area), 200,812 (combo) and 145,298 (donut) non-white pixels at typical.

Support was read from the Community bundle's module table (`enterprise: true` entries) in 14.3.0.

| type | supported | how |
| --- | --- | --- |
| stacked-bar | yes, native | `bar` series per series, `stacked: true`, `fill` from data. |
| stacked-area | yes, native | `area` series per series, `stacked: true`, `fillOpacity: 1`, 1 px stroke, markers off. |
| donut | yes, native | `donut` series (`DonutSeriesModule`, standalone chart), `fills` from data, `innerRadiusRatio: INNER_RATIO`. |
| combo | yes, native | `bar` + `line` series; the line binds to a second number axis via `yKeyAxis: 'right'`. |
| radar | no | `radar-line`/`radar-area` series and the `angle-*`/`radius-*` axes are Enterprise. |
| heatmap | no | `heatmap` series is Enterprise. |
| treemap | no | `treemap` series is Enterprise. |
| sankey | no | `sankey` series is Enterprise. |
| boxplot | no | `box-plot` series is Enterprise. |
| candlestick | no | `candlestick` (and `ohlc`) series are Enterprise; `ordinal-time` axis too. |

- **Size and MARGIN**: same as the main arm (chart `padding` top/right, `seriesArea.padding: 0`, axis `thickness` 44/56). Combo sets chart right padding to 0 and gives the right axis `thickness: COMBO_RIGHT`. Donut uses `padding: MARGIN`, so the series area is the plot rect and AG's radius equals `donutRadius`.
- **Axes**: tick labels, no axis titles (as the reference). Category axes have `label.autoRotate: false`; AG then drops colliding labels itself (heavy shows every 8th/16th/64th category) instead of rotating them.
- **Tooltip**: native. Stacked bar uses the default (heading = category, one row per series in the stack at typical, the hovered series only at heavy). Stacked area and combo use `tooltip.mode: 'shared'` (category + every series). Donut has a renderer returning `id: value`.
- **Effects**: `highlight.enabled: EFFECTS`; no Community animation. With effects on, hover dims the other series/sectors (AG's default highlight).
- **No legend**: Legend module not registered.
- **Data reshape**: AG wants one wide dataset per chart, so stacked bar/area and combo build rows `{ category, v0..vn }` in `useMemo`.

Deviations:
- Stacked area: on a category axis AG puts points at band centres, so the areas start and end half a step in from the plot edges (reference: edge to edge). A number axis with a label formatter would fix it at the cost of a custom tick mapping; not done.
- Donut: `sectorSpacing` defaults to 1 px of white between sectors; set to 0 to match the reference.
- Stacked bar tooltip: AG's default lists every series in the hovered stack at typical (3 series) but only the hovered segment at heavy (6 series × 200).
- Combo: the bar axis is `min: 0` with AG's nice max; a bar equal to the nice max touches the top edge.

Gotcha: the playground only offers a gallery type for a library listed in `results/gallery-bundle.json`, which `scripts/gallery-bundle.mjs` generates. Until it is rerun, the playground shows "Not supported" for every agcharts gallery type. Verified with a scratch Vite config that added agcharts entries to that JSON in memory: Render at typical gave an agcharts row for all four types (mount 40–48 ms, update ≈ 33 ms, 24 DOM nodes, no error), and Survival/Scatter still render and update. Heavy was checked by mounting `gallery.html?lib=agcharts&chart=…` directly with the `gallery-samples` generators. No console errors.
