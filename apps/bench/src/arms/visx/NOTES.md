# visx

Version: `@visx/*` 4.0.0 (axis, curve, event, grid, group, scale, shape, tooltip). `d3-array` (already a bench dependency) for `bisector`/`extent`/`max`; visx's own docs use it the same way.

visx is a primitives kit, not a charting library: there is no "survival chart" or "scatter chart" component, so almost everything is **composed**. Nothing is hand-drawn as raw SVG.

## Requirements

| Requirement | Class | How |
|---|---|---|
| 900×600, `MARGIN` | composed | `<svg width height>` + `<Group left top>`; inner size computed from `MARGIN`. |
| Animation off | native | visx renders plain SVG with no transitions; nothing to disable. |
| Axes, ticks, labels | native | `AxisBottom` / `AxisLeft` with `label`, `numTicks`. |
| Horizontal grid lines | native | `GridRows`. |
| Tooltip | composed | `useTooltip` + `TooltipWithBounds` + `localPoint` over a transparent `Bar` overlay (gallery pattern). Hit-testing is ours. |
| Colours from `series[i].color` | composed | passed as `stroke`/`fill` per series. |
| No legend | native | nothing rendered unless you add `@visx/legend`. |
| Step-after line | composed | `LinePath` + `curveStepAfter` from `@visx/curve`. |
| CI band, step-after, 15% | composed | `Area` with `y0`/`y1` accessors + `curveStepAfter`, `fillOpacity={0.15}`. |
| Censoring ticks ±4 px | composed | `@visx/shape` `Line` per censored point (`from`/`to`). |
| Survival axes 0..last x / 0..1, "Days"/"Survival" | composed | `scaleLinear` domains set by us; labels via axis `label`. |
| Survival tooltip (x + each series' value) | composed | `xScale.invert` + d3 `bisector` per series; dashed crosshair is a visx `Line`. |
| Circles, radius `size`, 70% opacity | composed | `Circle` per point inside a `Group fill fillOpacity`. |
| Nice linear X/Y, "X"/"Y" | composed | `scaleLinear({ nice: true })` over `extent`. |
| Scatter tooltip (nearest point) | composed | linear nearest-point scan within 20 px. visx's intended tool is `@visx/voronoi`, which isn't installed, so not used. |

## Casts

None. `scaleLinear<number>({...})` and the `Area<SurvivalPoint>` / `LinePath<SurvivalPoint>` generics keep accessors typed; `extent` results are destructured with defaults instead of `as [number, number]`.

## Gotchas

- `localPoint(event)` returns coords relative to the owning `<svg>`, not the `Group` — subtract `MARGIN` before `invert`.
- `TooltipWithBounds` positions absolutely; the wrapper `div` must be `position: relative` (the docs' examples do this).
- The event overlay `Bar` must be last in the group, or marks drawn after it swallow the mouse.
- Long data is fine: visx takes accessors per datum, no wide-format reshaping needed.
- Performance: one React element per circle. Heavy scatter (10 000 `<circle>`s) is ~130 ms in dev, ~5–8× the survival chart. No virtualisation/canvas option in visx itself.
- Scatter hover is O(n) per mousemove; at 10k points it's still fine, but voronoi/quadtree would be the upgrade.

## Settle mode

`raf`. Every mark is a synchronous React SVG element; no effect or async layout draws anything. Evidence: immediately after `benchStageSettled === true` the DOM already held all marks (typical survival: 6 paths, 71 lines; heavy scatter: 10 000 `<circle>`s), and screenshots taken then are complete.

## Dev-mode mount times (`bench:mount`, ms, Vite dev, warm deps, 2 runs)

| Chart | typical | heavy |
|---|---|---|
| survival | 20.3 / 21.7 | 24.3 / 24.4 |
| scatter | 17.0 / 17.2 | 127.3 / 134.6 |
