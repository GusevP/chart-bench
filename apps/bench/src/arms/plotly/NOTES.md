# Plotly.js arm

- plotly.js-gl2d-dist-min 4.2.0 (the partial bundle: cartesian + `scattergl` on WebGL via regl). Types from @types/plotly.js 3.0.10.
- No React wrapper. Each chart renders an empty `<div ref>`. One `useEffect` calls `Plotly.react(el, data, layout, config)`, which does a full `newPlot` the first time and diffs on later payloads (the embedded page's update runs). A second effect, with no deps, calls `Plotly.purge(el)` on unmount. `data`/`layout` are memoised on `series`/size. `onSettled` is held in a ref, so a parent re-render that passes a new closure doesn't redraw the chart.
- Every trace is `scattergl`: line, band and censor ticks on survival, and markers on scatter. Axes, grid, titles and the hover label are Plotly's usual SVG layers drawn over the GL canvas.

## Both charts

- **900 × 600, MARGIN**: native. `width`/`height` + `autosize: false`, `margin: { l: 56, r: 20, t: 20, b: 44, pad: 0 }`, `automargin: false` on both axes. Checked in the browser: the `.nsewdrag` plot rect is 56, 20, 824 × 536.
- **Animation off**: native, with nothing to switch off. `newPlot` has no grow-in animation. `Plotly.react` only animates when `layout.transition` is set, and it isn't. scattergl has no hover transitions. With `EFFECTS` on there is nothing to turn on either: Plotly has no built-in dim-the-others on hover (only legend `itemclick`), and there is no legend.
- **Axes, ticks, labels, horizontal grid**: native. `ticks: 'outside'`, `showline: true`, `zeroline: false`, `title: { text, standoff: 4 }`. `xaxis.showgrid: false` keeps only the horizontal grid lines.
- **Tooltip**: native hover labels (see each chart below).
- **Colours from `series[i].color`**: native. Line colour, marker colour and band `fillcolor` come from `s.color`. The band's 15% comes from trace `opacity: 0.15` (scattergl applies it to the fill), so no colour parsing is needed.
- **No legend**: native, `showlegend: false`.
- **Config**: `displayModeBar: false` (no toolbar), `responsive: false`. `staticPlot` stays off because it also turns off hover.

## Survival

- **Step-after line**: native, `line.shape: 'hv'` (horizontal then vertical, which is d3's `curveStepAfter`). scattergl expands `hv` into step vertices itself (`lineOptions.positions` holds 2n−1 points).
- **Confidence band**: composed, and a deviation from the docs pattern. The documented way is two traces, lower (unfilled) then upper with `fill: 'tonexty'`. On scattergl in 4.2.0 that draws **no band at all**: the upper trace's `fillOptions` have the right colour and zero positions. scattergl builds the tonexty polygon only on a trace that is itself `tonexty` *and* has a next trace. Setting `tonexty` on both traces drew only the first series' band: the polygon lands in the lower trace's `fillOptions`, but `fillOrder` draws the upper's empty ones, except for trace 0, which counts as its own fill (`_ownfill`). There is no error either way. Workaround: one trace per band with `fill: 'toself'`. Its x/y run along the upper edge forwards, then along the lower edge backwards with y shifted by one index, so that `hv` still steps after when the path is drawn right to left. The outline is hidden with `line.width: 0`. This also needs one trace per band instead of two.
- **Censoring ticks**: native marker, `symbol: 'line-ns-open'`, `size: 5.7` with `marker.line.width: 1`. Plotly draws `line-ns` at ±0.7 × size, so this gives about ±4 px. `marker.color` must also be `s.color`: scattergl colours the `-open` stroke from it, and with only `marker.line.color` set the ticks came out in the default colorway.
- **Axes 0..last x / 0..1, "Days"/"Survival"**: native, `range` + `title`. At huge size the x ticks switch to SI labels (`5k`, `10k`).
- **Tooltip: x + each series' value**: native, `hovermode: 'x unified'`. The band and tick traces have `hoverinfo: 'skip'`, the line has `hovertemplate: '%{y:.3f}'`, and the title is `xaxis.unifiedhovertitle.text: 'Day %{x:.0f}'`. **Deviation**: unified hover picks each trace's *nearest* point in x, not the last step at or before the pointer. The header is that point's x, not the pointer x. Observed: Arm A steps from 0.860 (day 103) to 0.855 (day 106). With the pointer at about day 105.4, where the line still shows 0.860, the label read "Day 106 / Arm A : 0.855". Plotly offers no hook to change how hover picks its points, so I left it native. Checked: "Day 198 / Arm A : 0.736 / Arm B : 0.751 / Arm C : 0.733".

## Scatter

- **Circle radius = `point.size`, 70% opacity**: native. `marker.size` is a **diameter** in px, so it is `2 * p.size` per point as an array. `marker.opacity: 0.7`, `marker.line.width: 0`.
- **Nice linear axes, "X"/"Y"**: native autorange. **Deviation**: Plotly pads the data extent by the marker radius (about 5%) but does not snap the ends to tick values the way d3's `.nice()` does, so the axes end on unround numbers. For typical, `_fullLayout` ranges are x −2.62..88.80 and y 10.07..99.63, where the `none` reference has 0..90 and 10..100.
- **Tooltip: nearest point's series id and x, y**: native, `hovermode: 'closest'` + `hovertemplate: '<id>: (%{x:.1f}, %{y:.1f})<extra></extra>'`. Checked: "Group 1: (4.6, 22.3)".

## Casts

- No `as` cast on data. `as const` on the shared `axis` object keeps `ticks: 'outside'` a literal.
- `// @ts-expect-error` on the import (not a cast, but the one typing hole): `plotly.js-gl2d-dist-min` ships no types, and `declare module` for it inside a module file is refused (TS2665, an untyped module can't be augmented). The default import is then assigned to `const Plotly: typeof import('plotly.js')`, so everything after the import is typed. A shared ambient `.d.ts` (`declare module 'plotly.js-gl2d-dist-min' { export * from 'plotly.js' }`) would be cleaner.
- `xaxis.unifiedhovertitle` is missing from @types/plotly.js 3.0.10. It is passed through a non-literal object, so excess-property checking doesn't fire; no cast is needed.
- `ref.current!` inside the effect.

## Gotchas

- The scattergl `tonexty` bug above fails silently: the `fillOptions` exist with the right colour, and only the draw list is wrong.
- `marker.size` is a diameter, not a radius.
- Default `plotGlPixelRatio: 2`: the GL canvases are 1800 × 1200 backing pixels even at devicePixelRatio 1, which means 4× the fill cost of a 1× canvas. Left at the default.
- Each plot creates three full-size GL canvases (context, focus, pick). `Plotly.purge` on unmount is needed, or remounts leak WebGL contexts. Checked: still 3 canvases after 4 remounts, and no "too many WebGL contexts" warning.
- `preserveDrawingBuffer` is on in Plotly's regl setup (it needs it for `toImage`), which is what makes the pixel check below possible.
- The data is long and per series (`{x, y}` objects), and Plotly wants column arrays, so every trace does `.map` per field. The band also needs a concatenated, reversed polygon.

## Settle mode: `signal`

- Hook: the promise returned by `Plotly.react` (which delegates to `newPlot` on first call), which resolves after the plot and its `plotly_afterplot` event. The callback is guarded by a per-effect `live` flag, so a promise from a purged mount can't settle a later remount.
- Evidence: in agent-browser (dev server) I wrapped `requestAnimationFrame` before `benchStage.mount()`. On each call I drew every canvas in the stage to a 2D canvas and counted non-transparent pixels, logging the caller stack. The first rAF came from `BenchStage.requestSettle` ← `settled` (ArmPage) ← the `Plotly.react` promise. At that moment `gl-canvas-context` already had **271,710 / 2,160,000** inked pixels for survival/typical and **181,468 / 2,160,000** for scatter/typical. The focus and pick canvases were 0, as expected.
- Renderer: `WEBGL_debug_renderer_info` reported `ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Pro)`. agent-browser's headless Chrome used the real GPU, not SwiftShader. I did not check the renderer under the Playwright bench runner.

## Dev-mode mount times (`bench:mount`, ms, mount + 4 remounts, Vite dev server, agent-browser headless Chrome)

| chart | typical | heavy | huge |
| --- | --- | --- | --- |
| survival (3×200 / 6×1000 / 10×10 000) | 389, 248, 399, 102, 119 | 250, 112, 198, 143, 87 | 1145, 667, 277, 470, 461 |
| scatter (500 / 10 000 / 100 000) | 126, 66, 73, 73, 59 | 117, 51, 35, 68, 44 | 134, 139, 155, 145, 147 |

These are noisy: other benchmark agents were running browsers on the same machine. There were no console errors or warnings at any size. Dev numbers only; not comparable to the production benchmark.

## Gallery

- Bundle: the full **plotly.js-dist-min 4.2.0**, because the gl2d partial bundle has no bar, pie, polar, heatmap, treemap, sankey, box or candlestick traces. None of these traces need WebGL, so they are all Plotly's SVG traces (heatmap paints one `<image>`).
- **Types**: unlike `plotly.js-gl2d-dist-min`, `plotly.js-dist-min` 4.2.0 ships its own types (`"types": "lib/index.d.ts"`, generated from the 4.2.0 schema), so the gallery imports `Plotly`, `Data`, `Layout`, `Config` and `PlotlyHTMLElement` from it directly: no `@ts-expect-error`, no `@types/plotly.js`, and no `as` casts on data.
- `shared/Plot.tsx` is the gallery's `<Plot figure onSettled init?>`. It is the same mechanism as `usePlot` in `charts.tsx` (`Plotly.react` effect, `purge` on unmount, `onSettled` in a ref, a per-effect `live` guard), but bound to the full bundle. `init` runs once after the first draw, because `el.on` only exists once `newPlot` has run. `charts.tsx` is unchanged; it could use the same component if it were given a Plotly instance.
- All ten types are supported. Each is a trace that Plotly ships, so no type is composed.
- Common to all: `width`/`height` + `autosize: false`, `margin` = `MARGIN` with `pad: 0`, `automargin: false`, `showlegend: false`, `displayModeBar: false`. Category axes are `type: 'category'`, `tickangle: 0`, with `tickvals` = shared `thinTicks`, so labels never auto-rotate into the 44 px margin. Axes are labelled by tick labels, with no titles, as in the other arms. Checked in the browser: the plot rect (`.nsewdrag`) is 56, 20, 824 × 536 for every cartesian type, and 56, 20, 788 × 536 for combo, which uses `COMBO_RIGHT`.
- **Effects**: Plotly animates only when `layout.transition` is set or on `Plotly.animate`, and neither is used, so there is no grow-in with `EFFECTS` on or off. Two hover/click effects are not animations but are handled anyway:
  - Treemap: a click on a sector drills down with an animated zoom (seen mid-transition in a screenshot). This is blocked in both modes with `plotly_treemapclick` → `false`, the documented way to cancel it, as echarts does with `nodeClick: false`.
  - Sankey: hovering a link restyles it by default. With `EFFECTS` off, `link.hovercolor` is the link's own colour, so nothing changes (checked: 0 links changed opacity under the pointer). With `EFFECTS` on it is left at Plotly's default (checked: 1 link changed).
  - Treemap hover outlines the hovered leaf. Plotly has no attribute for this, so it is left as is.
- **Settle**: the `Plotly.react` promise, as for the arm. Evidence: `performance.mark` was wrapped so that when `bench:settled` fired, the DOM was counted. Treemap heavy had all **5051** `path.surface` (1 + 50 + 5000) at that moment, and heatmap heavy had its `<image>` with a 31 kB data URL already set.

| type | trace | notes / deviations |
| --- | --- | --- |
| stacked-bar | `bar` × series, `barmode: 'stack'`, `bargap: 0.2` | Tooltip: `hovermode: 'x unified'`, e.g. "C2 / Series 1 : 45 / Series 2 : 35 / Series 3 : 40". The unified hover also draws a dotted spike line, which is native. |
| stacked-area | `scatter` `mode: 'lines'`, `stackgroup: 'one'`, opaque `fillcolor` = series colour | `xaxis.range [0, n−1]` so the first and last categories sit on the plot edges. The unified tooltip shows the raw (unstacked) values. |
| combo | `bar` on `y` + `scatter` lines on `y2` (`overlaying: 'y'`, `side: 'right'`), both `rangemode: 'tozero'` | **Gotcha**: in 4.x an overlaying axis defaults to `tickmode: 'sync'` (ticks aligned to the left axis), which gave 160/319/479/638/798 on the right. `tickmode: 'auto'` gives 0..800 by 100. |
| donut | `pie`, `hole: INNER_RATIO`, `sort: false`, `direction: 'clockwise'`, `rotation: 0`, `textinfo: 'none'` | Radius 268 = `donutRadius`, centred in the plot rect (checked: `.pielayer` 200, 20, 536 × 536). |
| radar | `scatterpolar` `fill: 'toself'`, `polar.gridshape: 'linear'`, `angularaxis.rotation: 90`, `direction: 'clockwise'` | The first point is repeated, or the stroke stays open. 20 % fill via `#rrggbbaa` (`withAlpha`, see below). Radial `dtick = max / RADAR_RINGS`; tick labels off. Tooltip: `hovermode: 'closest'` on vertices only (≈20 px), one series ("C2: 22 Series 3"), not all series at a category as in the reference. |
| heatmap | `heatmap`, two-stop `colorscale` from `HEAT_RANGE`, `zmin`/`zmax` from `heatmapDomain` (±1 when flat, so a flat grid takes the middle colour), `showscale: false` | `yaxis.autorange: 'reversed'` puts row 0 on top. Tooltip "Y11 / X6: 31". |
| treemap | `treemap` with `ids`/`parents`/`values`, `branchvalues: 'remainder'`, `sort: false`, `tiling.pad: 0`, `marker.pad: 0`, `pathbar.visible: false`, `textinfo: 'none'`, `squarifyratio: φ` | Parents are transparent and only leaves take `treemapRamp`. The leaves exactly fill 56,20 → 880,556. Plotly's squarify is d3's, but it lays out every level (root → group → leaf), so cells differ from the `none` reference. Thin light seams show between some leaves (SVG antialiasing on fractional edges). |
| sankey | `sankey`, `arrangement: 'fixed'`, `node.align: 'left'`, `thickness: NODE_WIDTH`, `pad: NODE_GAP`, `valueformat: '~g'` | **Deviation**: links have no "colour by source" mode, so each link gets its source node's colour with `LINK_OPACITY` alpha appended as hex. Node labels are off (no `label`). The id goes in `customdata` for the tooltip ("Node 3 → Node 11: 19", "Node 2: 14"). Without `valueformat`, values show as "19.0". Plotly's own d3-sankey layout sets node positions; `ITERATIONS` can't be set. At heavy it shrinks nodes to fit 150 of them, so they look thin. |
| boxplot | `box` per group (`fillcolor` = group colour, `line` = `BOX_STROKE`), `boxpoints: 'outliers'`, `boxgap: 1 − BOX_RATIO`, **`boxgroupgap: 0`** | Plotly computes the statistics from the raw values; `boxplotStats` is not used. Its default `quartilemethod: 'linear'` is Langford #10, while the shared one is R-7, so Q1/Q3 differ by ≤ 0.05 on typical (e.g. Group 1 Q1 42.10 vs 42.15). Medians, whiskers (1.5 IQR fences clamped to data) and outlier counts matched for the groups checked. The y range is shared `niceScale` over all values. `boxgroupgap` (default 0.3) also shrinks boxes in overlay mode: without it the width was 0.42 of a band, and with it 0.60 (61.8 px of 103). Tooltip: Plotly's stat labels (max/upper fence/q3/median/q1/lower fence/min). |
| candlestick | `candlestick`, `increasing`/`decreasing` line + fill from `CANDLE_UP`/`CANDLE_DOWN`, `boxgap: 1 − CANDLE_RATIO`, `boxgroupgap: 0`, `rangeslider.visible: false` | A category x axis (dates skip weekends, so a date axis would leave gaps) with `thinTicks` labels; at 12 labels of 10 characters they nearly touch. Y range from `candleScale`. **Deviation**: Plotly gives a flat candle (open = close) the *previous* candle's direction, while the shared `isUp` counts flat as up. 4 of 11 flat candles in typical are drawn red. Tooltip: `hovermode: 'x'`, "2020-04-15 / open / high / low / close ▼". |

- `withAlpha(hex, a)` appends an alpha byte, so radar fill and sankey links assume `#rrggbb` data colours, which is what the generators emit. Plotly parses colours with tinycolor, which takes `#rrggbbaa` but not CSS `color-mix()`.

### Dev-mode mount (ms, one mount, gallery page posted directly, `EFFECTS` off, agent-browser headless Chrome)

| type | typical | heavy |
| --- | --- | --- |
| stacked-bar | 65 | 51 |
| stacked-area | 19 | 21 |
| combo | 34 | 43 |
| donut | 34 | 27 |
| radar | 36 | 26 |
| heatmap | 31 | 28 |
| treemap | 32 | 476 |
| sankey | 29 | 75 |
| boxplot | 22 | 67 |
| candlestick | 26 | 77 |

The playground cannot measure these yet: it marks a type "Not supported" unless `results/gallery-bundle.json` has an entry for the library, and plotly has none until `scripts/gallery-bundle.mjs` is re-run. There were no console errors at either size.
