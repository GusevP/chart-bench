# nivo arm

Version: `@nivo/line` 0.99.0, `@nivo/scatterplot` 0.99.0, `@nivo/core` 0.99.0. SVG components `Line` and `ScatterPlot` with a fixed `width`/`height` (not the `Responsive*` wrappers).

## Requirements

### Both charts
- **900 × 600 plot with `MARGIN`**: native. `width`, `height`, `margin={MARGIN}`.
- **Animation off**: native. `animate={false}`. Cost that remains: nivo still routes geometry through react-spring with `immediate: true`. `ScatterPlot`'s nodes layer runs `useTransition` over every node, and `Line`'s lines/areas use `useAnimatedPath`. The springs don't animate, but they're still allocated and updated on mount.
- **Axes with ticks and labels, horizontal grid**: native. `axisBottom`/`axisLeft` with `legend`, `legendPosition: 'middle'`, `legendOffset`, plus `enableGridX={false}` (grid Y is on by default).
- **Tooltip**: native on both charts. Scatter uses the default mesh (Voronoi) tooltip. Survival uses `enableSlices="x"` with a custom `sliceTooltip` component (see below).
- **Colours from `series[i].color`**: native. Line uses `colors={{ datum: 'color' }}`, which reads `color` off each series. Scatter uses a `colors` function `({ serieId }) => color`, because its colour context only gets `serieId`.
- **No legend**: native. `legends` defaults to `[]`.

### Survival
- **Step-after line**: native. `curve="stepAfter"`.
- **Confidence band**: composed. A custom layer function in `layers` takes nivo's `xScale`/`yScale` and builds a `d3-shape` `area().curve(curveStepAfter)` over `lower..upper` at `fillOpacity` 0.15. The built-in `enableArea` only fills down to a single `areaBaselineValue`, so it can't draw a lower..upper band.
- **Censor ticks**: composed. A second custom layer draws a ±4 px `<line>` at each censored datum's precomputed `position`.
- **Axes 0..last x / 0..1, "Days" / "Survival"**: native. `xScale={{ type: 'linear', min: 0, max: lastX, nice: false }}` and `yScale` 0..1.
- **Tooltip (x + every series' value)**: composed. Slices are native, but nivo groups points into a slice only when they share an exact x. Our series have different x values, so a slice usually holds one series. The custom `sliceTooltip` takes the slice's x and looks up every series' step value with a `d3-array` bisector.

### Scatter
- **Circle radius = `point.size`, 70% opacity**: composed. `nodeSize={n => n.data.size * 2}` is native (`nodeSize` is a diameter). The default node component has no opacity prop, so a custom `nodeComponent` renders a plain `<circle fillOpacity={0.7}>` from `node.x/y/size/color`. It ignores the spring `style` values, which is fine with animation off.
- **Nice linear axes "X"/"Y"**: native. `{ type: 'linear', min: 'auto', max: 'auto', nice: true }`.
- **Tooltip (series id, x, y)**: native. The default tooltip, with `xFormat`/`yFormat=">-.2f"` to round the numbers.

Nothing is hand-drawn. The extra marks go through nivo's documented custom-layer and `nodeComponent` extension points.

## Casts
None.

## Gotchas
- **Long vs. nivo shape**: nivo wants `{ id, data: [{x, y, ...}] }`. We map `points` to `data`, and extra fields (`lower`, `upper`, `censored`, `size`) pass through on `datum.data`.
- **The linear scale is `nice` by default**: with only `max: lastX`, the x axis was silently stretched to 450 when the data ends at about 412. You need `nice: false`.
- **The default scatter scale starts at `min: 0`**, and the default Line `xScale` is `point` (categorical). Both have to be overridden.
- **Slices group by exact x**: there is no built-in "value of every series at this x" for series that don't share x values (see the survival tooltip above).
- **`ScatterPlotNodeData.serieIndex` is the datum's index within its series**, not the series index. `compute` assigns the inner `forEach` index, so it can't be used to pick a colour.
- **Default `layers` include `points` and `mesh`**: with `enablePoints={false}` and slices on, listing the layers explicitly drops both.
- **Scatter at 10k nodes is slow**: the per-node spring transition plus the Voronoi mesh is the likely cost (see the timings below).

## Settle mode
`raf`. Both components are pure SVG and render their marks synchronously in the React commit. There is no post-commit canvas draw. Evidence: when `benchStageSettled` turned true, the DOM already held every mark. Scatter heavy had 10 000 `<circle>`. Survival typical had 6 `<path>` (3 bands + 3 lines) and its tick and censor `<line>`s.

## Dev-mode mount times (sanity only, not benchmark numbers)
`performance.getEntriesByName('bench:mount')`, Vite dev server, headless Chromium:
- survival typical: about 43–61 ms; survival heavy (6 × 1000): about 109–138 ms
- scatter typical: about 71–118 ms; scatter heavy (10 000 points): about 3.3–3.6 s
