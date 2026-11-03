# TanStack Charts arm

Version: `@tanstack/charts` 1.2.0. The component is `Chart` from `@tanstack/charts/react`; marks and `defineChart` come from `@tanstack/charts`.

## What 1.x is

- TanStack Charts 1.x is a **mark grammar** in the style of Observable Plot, not a series/axes config.
- You write `defineChart({ marks: [lineY(rows, …), areaY(…), dot(…)], scales: { x: { scale, grid, axis: { label } }, y: … }, color, margin, focus, tooltip })` and pass the result to `<Chart definition={…} />`.
- The core is framework-neutral, and the React adapter is a thin lifecycle wrapper.
- `@tanstack/react-charts` 1.2.0 is now a compatibility wrapper. Its README sends new apps to `@tanstack/charts/react`. It exports only the `Chart` component, so on its own it cannot build a chart: `@tanstack/charts` has to be a direct dependency. The first attempt failed to resolve under pnpm, and the coordinator then added that dependency.

## Requirements

| Requirement | How | Notes |
| --- | --- | --- |
| 900 × 600 | native | `width`/`height` props on `Chart`. A fixed `width` disables ResizeObserver width tracking. |
| `MARGIN` plot area | native | `margin: MARGIN` locks every side. Otherwise the margins are automatic, sized from measured tick labels. |
| Animation off | native default | `svgAnimation` defaults to `false`, and motion is the opt-in `motion()` renderer. Nothing to turn off. |
| Axes, ticks, labels | native | `scales.x/y.axis.label`. |
| Horizontal grid | native | `scales.y.grid: true`. |
| Tooltip | native | The `tooltip` extension from `@tanstack/charts/tooltip`. It is off by default (`tooltip: false`). |
| Colours from `series[i].color` | native | `color: { domain: ids, range: colors }`, with `z: 'series'` as the group/colour channel. |
| No legend | native default | Legends are opt-in (`colorLegend`). |
| Step-after line | native, with a d3 bridge | `lineY(…, { curve: d3Curve(curveStepAfter) })`. There is no built-in step curve; `d3Curve` is the documented bridge, and `d3-shape` was already a dependency. |
| CI band, 15% | native | `areaY(rows, { y1: 'lower', y2: 'upper', z, fillOpacity: 0.15, curve })`. The default `fillOpacity` is 0.2, so 0.15 is set explicitly. |
| Censoring ticks ±4 px | native | `tickX(censoredRows, { length: 8 })`. |
| Survival x `0..last`, y `0..1` | native | Configured scale instances: `scaleLinear().domain([0, lastX])` and `.domain([0, 1])`. |
| Survival tooltip: x plus every series' value | composed | `focus: 'nearest-x'` plus `tooltip.content`. `content` returns rows built from our own data with a step lookup (`bisector`). The built-in `group-x` only groups points that share the *exact* same x, and each arm has its own event times, so it would list one series. The x shown is the focused point's x, snapped to the nearest event, not the raw pointer x. |
| Scatter circles, radius `size`, 70% | native | `dot(rows, { r: 'size', fillOpacity: 0.7 })`. `r` is raw pixels (the default `rScale` is identity). |
| Scatter nice linear axes | native | `scale: scaleLinear` factory (domain inferred from the marks) plus `nice: true`. |
| Scatter tooltip: series, x, y | native default | The default nearest-point tooltip shows the group label (series id) as its title, plus X and Y rows using the axis labels. |

`decorative()` (`@tanstack/charts/mark/decorative`) is applied to the band and the censor ticks. Without it every layer adds its own interaction points, so the tooltip and keyboard navigation would list the band's and ticks' points too. The docs recommend exactly this: choose one interaction owner per set of observations.

## Casts

None. The definition infers the datum types end to end.

## Data shape

Marks take one flat iterable and group it with a `z` channel. Our data is nested (`series[].points[]`), so each chart flattens it into rows with a `series` field (`flatMap`), and censored rows are filtered into a separate source for `tickX`.

## Defaults that cost DOM or time

The suspicion was a keyboard/focus-ring accessibility layer that pre-renders DOM per point. **It doesn't.**
- The defaults are `keyboard: true` (SVG `tabindex=0`, arrow-key navigation over points), `pointer: true` and `focusRing: true`.
- The only DOM these add is one empty `<g class="ts-chart__focus-layer">`. The ring is drawn into it only on focus.
- Keyboard navigation works from an in-memory point list, not DOM.

DOM nodes inside `[data-bench-stage]`, measured in dev mode:

| Chart | Defaults (shipped) | `keyboard: false, focusRing: false` |
| --- | --- | --- |
| survival typical (3 × 200) | 107 | 106 |
| survival heavy (6 × 1000) | 540 | 539 |
| scatter typical (500) | 563 | 562 |
| scatter heavy (10 000) | 10 055 | 10 054 |

The opt-out saves one node and makes no measurable time difference, so the arm ships with the defaults.

Other observations:
- Scatter renders one `<circle>` per point and nothing else per point.
- Survival renders one `<path>` per series per layer (12 paths for 6 series: band + line) and one `<line>` per censoring tick.
- Nearest-point search is a linear scan by default. The docs suggest a `spatialIndex` factory for dense data. This would affect hover cost on scatter-heavy, not mount time.

## Settle mode: `raf`

The SVG is in the DOM, complete, when React commits.
- The adapter's chart surface is empty during render (`useSyncExternalStore` returns `''` markup on the client).
- `adapter.mount(container)` then builds the whole SVG synchronously inside the `Chart` component's `useLayoutEffect`.
- Child layout effects run before `BenchStage`'s own layout effect, so the SVG exists before `raf` mode requests settle.
- With a fixed `width`/`height` there is no ResizeObserver pass that could replace the scene later.

Evidence: a `MutationObserver` on `[data-bench-stage]`, attached before `benchStage.mount()`, reports full SVG node counts in its **first** callback (survival typical 103 SVG nodes, scatter heavy 10 051). That first count already equals the final count, so nothing is painted after commit.

`onRender` was first wired up as a `signal` hook. It was removed after this check, because ARMS.md reserves `signal` for renderers that paint after commit.

## Dev-mode numbers

`bench:mount` in the Vite dev server, headless Chromium, one run each. Heavy is 3 runs.

| Chart | typical | heavy |
| --- | --- | --- |
| survival | 24–37 ms | 36–46 ms |
| scatter | 21–31 ms | 58–60 ms |

The hover check passed on both charts (screenshots `*-hover.png`):
- Survival shows "Day 197", then Arm A 0.742, Arm B 0.754, Arm C 0.738, each with a colour swatch.
- Scatter shows "Group 4" with X 43.071, Y 60.443.

## Gotchas

- The adapter's own `role="status"` tooltip lives inside the chart host. Click pins it (`sticky`) and Escape dismisses it.
- `onRender` fires after every reconciliation, not only the first. If used as a settle signal it needs a once-guard; `BenchStage`'s `requestSettle` already has one.
- Without `margin`, the layout solver measures text with the container font. The plot rectangle then differs from the other arms, which is why `MARGIN` is passed.
