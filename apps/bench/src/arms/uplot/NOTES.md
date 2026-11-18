# uPlot arm

- uplot 1.6.32. No React wrapper: a small `UPlot` component (`shared.tsx`, shared with the gallery) runs `new uPlot(opts, data, div)` in `useEffect` and `u.destroy()` in its cleanup, the mount pattern from uPlot's README. `uplot/dist/uPlot.min.css` is imported; without it the cursor overlay and axes are mispositioned.
- Survival uses mode 1 (aligned data). Scatter uses mode 2 (faceted, per-series x/y/size), the mode uPlot's scatter/bubble demos use.

## Both charts

- **900 × 600, MARGIN**: native. `width`/`height` options; `padding: [20, 20, 0, 0]`; each axis gets `size + labelSize` = MARGIN (x: 30 + 14 = 44, y: 42 + 14 = 56). uPlot adds `labelSize` on top of `size`, so the two have to be split by hand.
- **Animation off**: native. uPlot has no animation of any kind. Hover effects off: `cursor.points.show: false`, `focus.alpha: 1`, `cursor.focus.prox: -1`.
- **Effects on**: native on survival: `focus: { alpha: 0.3 }` + `cursor.focus.prox: 30` (dim the others) and the built-in cursor points. Scatter gets no effects: mode 2 has no series focus, and the hover dots would need our own `dataIdx` anyway.
- **Axes, ticks, labels, horizontal grid**: native. `axes[].label`; x `grid.show: false` keeps the tick marks and drops the vertical grid lines.
- **Tooltip**: composed. uPlot has no tooltip; following the tooltips demo, a plugin adds a `div` to `u.over` in `init` and fills it in `setCursor`. Flipping at the plot's midpoint copies the reference.
- **Colours from `series[i].color`**: native. Alpha comes from appending hex alpha (`26` = 15%, `b3` = 70%), so this **assumes 6-digit hex colours** (true for `PALETTE`). uPlot has no colour helper.
- **No legend**: native. `legend: { show: false }`.
- Drag-to-zoom (on by default, and on both axes in mode 2) is turned off with `cursor.drag: { x: false, y: false }`. The reference has no zoom, and zooming would move the censor ticks out of the plot area unclipped.

## Survival

- **Step-after line**: native. `uPlot.paths.stepped({ align: 1 })`.
- **Data shape**: uPlot needs one shared x array; our series each have their own x grid. `uPlot.join()` (native) merges them, so every series gets an `undefined` wherever another series has an x. Joined-in `undefined` is not treated as a gap, so the stepped path holds the last value across it. This is correct step-after with no `spanGaps`. At huge size the joined table is about 20k x values × 31 columns, mostly `undefined`.
- **Confidence band**: native. Each series adds two more series (lower, upper) with the same stepped path, `width: 0`, no points, plus `bands: [{ series: [upper, lower], fill }]` at 15% alpha. The band follows the stepped edges in both directions.
- **Censoring ticks**: composed. A `draw` hook strokes ±4 px vertical lines with `u.ctx` at `u.valToPos(..., true)` (canvas pixels, scaled by `uPlot.pxRatio`). A points-only series with a custom points path would also work, but it would need a fourth column per series in the joined table.
- **Axes 0..last x / 0..1, "Days"/"Survival"**: native. `scales.x: { time: false, range: [0, lastX] }`, `scales.y.range: [0, 1]`. `time: false` is required, because the x scale is a time scale by default.
- **Tooltip: pointer x + each series' value**: composed. uPlot's default `cursor.dataIdx` snaps each series to its *closest* non-null index, which for a step function is wrong half the time. A custom `cursor.dataIdx` (the documented refiner) steps back to the last index with x ≤ pointer x and a value in that series. The plugin then reads `u.cursor.idxs`. The title is `posToVal(cursor.left)`. The built-in vertical cursor line stands in for the reference's dashed crosshair (`cursor.y: false`).
- With effects on, focus dimming applies to lines and bands but not to the censor ticks, which the draw hook paints at full alpha.

## Scatter

- **Circle per point, radius `size`, 70% opacity**: composed. A custom series `paths` builder (the pattern from uPlot's scatter demo) puts every circle of a series into one `Path2D` and fills it once, then returns `null`. Size comes from the third facet value. **Deviation:** one fill per series means circles that overlap within a series don't get darker; the reference (one SVG circle each) and Chart.js do compound. Between series they compound as usual.
- **Nice linear axes, "X"/"Y"**: composed. uPlot's `rangeNum` only rounds to a tenth of the magnitude (2.4..83.1 → 2..84), which isn't "nice". A small `range` function rounds out to a 1/2/5 step aiming at about 10 ticks, like d3's `nice()`: typical 0..90 / 10..100, huge −20..120 / 0..120.
- **Tooltip: nearest point's series id and x, y**: composed. In mode 2, `cursor.dataIdx` is called per series. For series 1 it runs a nearest-point scan over every point (CSS pixels, no distance cap, like Chart.js `intersect: false`). It returns the hit's index for the hit series and `null` for the others, and the tooltip plugin anchors on that point. uPlot's demo uses a quadtree. A linear scan of 100k points per mousemove was fine here, and that ceiling is marked in the code.
- Points near the edge are clipped by the plot area, as with Chart.js.

## Casts

- One: the mode-2 data `[null, [xs, ys, sizes], ...]` is cast `as unknown as uPlot.AlignedData`. uPlot's typings only describe mode 1 data, even though the constructor accepts both.
- `!` for `uPlot.paths.stepped!` (optional in the `PathBuilderFactories` type), `u.cursor.left!`/`top!`/`idxs!` (optional in `Cursor`), `ref.current!`, and indexed access under `noUncheckedIndexedAccess`.

## Gotchas

- The x scale defaults to `time: true` (unix seconds). Numeric x data is silently drawn as dates unless you set `time: false`.
- `labelSize` (default 30) is added on top of `size` (default 50 for x). With the defaults the x axis takes 80 px.
- Series points auto-show when the data is sparse enough. Set `points: { show: false }` on every line and band edge, or survival/typical grows dots.
- Mode-2 defaults differ: drag-zoom on both axes, and the default `dataIdx` scans for x-closest only, which tells you nothing for unordered scatter data.
- Options, data and `onSettled` are memoised/stable effect deps; any identity change destroys and rebuilds the chart.

## Settle mode: `signal`

- Hook: `hooks.ready`, passed per instance by the `UPlot` component. uPlot draws in a microtask after construction (`commit()` → `_commit()`): it clears, runs `drawOrder` (axes, series), fires `draw` (our censor ticks), and only then fires `ready`, once per instance. No guard is needed.
- Evidence (agent-browser, Vite dev server, DPR 1): before `benchStage.mount()` I wrapped `requestAnimationFrame` to count non-transparent canvas pixels with `getImageData` and record the caller stack. The first rAF came from `BenchStage requestSettle ← ArmPage settled ← uplot.js fire('ready')`. It saw **87,457 / 540,000** inked pixels for survival/typical and **63,600 / 540,000** for scatter/typical. No rAF ran earlier; only the settle double-rAF ran.

## Dev-mode mount times (`bench:mount`, ms, single run, Vite dev server, headless Chrome 152)

| chart | typical | heavy | huge |
| --- | --- | --- | --- |
| survival (3×200 / 6×1000 / 10×10 000) | 31 | 29 | 73 |
| scatter (500 / 10 000 / 100 000) | 18 | 33 | 106 |

Dev numbers only; not comparable to the production benchmark. No console errors at any size, and hover worked at huge.

## Gallery

Support is decided by who draws the geometry. uPlot 1.6.32 exports five path builders (`uPlot.paths.linear`, `spline`, `stepped`, `bars`, `points`) and series fill/bands, nothing else. Its pie, heatmap, box-whisker, candlestick-OHLC and similar pages are demos that draw on `u.ctx` in hooks, so they do not count. `npm search uplot` found wrappers (uplot-react, yagr, framework bindings) but no published plugin package for any missing type.

| Type | Status | Why |
| --- | --- | --- |
| Stacked bar | supported | `uPlot.paths.bars` draws every bar. Stacking is composed (see below). |
| Stacked area | supported | Default linear path + series `fill` draws every area. Stacking is composed. |
| Bar + line | supported | `paths.bars` series on `y`, default line series on a second scale with a right axis (`side: 1`). All native. |
| Donut | not supported | No polar/arc series; x/y scales only. |
| Radar | not supported | No polar scale or radial path builder. |
| Heatmap | not supported | No cell series; the heatmap demos draw rects in a hook. |
| Treemap | not supported | No hierarchy layout or rect series. |
| Sankey | not supported | No node/link layout. |
| Box plot | not supported | No box-whisker builder; the demo draws in a hook. |
| Candlestick | not supported | No OHLC builder; the candlestick demo draws bodies and wicks in a hook. |

- **Stacking (borderline, flagged)**: uPlot has no stacking option. We pass cumulative sums as the data and list series topmost-first, so each taller bar/area is painted over by the shorter ones below it (opaque colours, so no bands are needed). uPlot draws every shape; we only transform the data. If that counts as "writing it ourselves", drop stacked-bar and stacked-area.
- **Category x axis**: composed. uPlot has no category scale. x is the category index with `time: false`; ticks come from `splits` (thinned with the shared `thinTicks`) and labels from `values`. Bars use x range `[-0.5, n - 0.5]` and `size: [0.8]` (= the reference's 0.2 band padding); the area spans `[0, n - 1]`.
- **Y axes from 0, nice**: the scatter `nice` range function, called with min 0. No axis titles, like the reference.
- **MARGIN**: native as for survival/scatter: `padding [20, 20, 0, 0]`, x axis `size: 44`, y axis `size: 56`. Combo: right padding 0 and a right axis of `COMBO_RIGHT` (56), like the reference.
- **Tooltip**: composed, the same plugin as survival: category plus every series' raw value in data order, at the snapped index (`u.cursor.idx`). Like Chart.js `mode: 'index'`; the reference's stacked bar shows only the hovered segment.
- **No crosshair**: `cursor.x/y: false`. Drag-zoom off. Hover effects are `cursor.points.show: EFFECTS` only; with `points.show: false` on the series no dot is visible either way, so effects on and off look the same.
- **Settle**: `signal` via `hooks.ready`, same `UPlot` component as survival/scatter (axes and series are drawn before `ready`).
- **Deviations**: no axis baseline (uPlot draws ticks and grid only, as on survival); at heavy the 200 × 0.8 bar widths round so the gaps between bars mostly disappear.
