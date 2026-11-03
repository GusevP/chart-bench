# Chart.js arm

- chart.js 4.6.1, react-chartjs-2 5.3.1 (`Line` and `Scatter` typed components).
- Tree-shaken: registers only `LinearScale`, `PointElement`, `LineElement`, `Filler`, `Tooltip`; `Line`/`Scatter` from react-chartjs-2 register `LineController`/`ScatterController` themselves. No `chart.js/auto`, no Legend/Title/Colors/Decimation.
- Performance path: `parsing: false` + `normalized: true` on both charts. Possible because our points are already `{x, y}` objects with x strictly increasing per series (survival) — extra fields (`lower`, `upper`, `censored`, `size`) are ignored. The band's upper/lower datasets need a `.map` to `{x, y}` first (the alternative, `parsing: { yAxisKey: 'upper' }`, would forfeit `parsing: false`).

## Both charts

- **900 × 600, MARGIN** — native/composed: `responsive: false` + `width`/`height` props; `layout.padding` for top/right and scale `afterFit` callbacks pinning the y-axis box to 56 px and x-axis box to 44 px, so the chart area equals MARGIN. Without `afterFit`, Chart.js sizes axis boxes from label widths.
- **Animation off** — native: `animation: false` (this also turns off hover/tooltip transitions; the tooltip checks `chart.options.animation` first).
- **Axes, ticks, labels, horizontal grid** — native: linear scales with `title`; x `grid.drawOnChartArea: false` keeps the x tick marks but drops vertical grid lines.
- **Tooltip** — native tooltip plugin, see per-chart details.
- **Colours from `series[i].color`** — native; alpha variants via `color()` from `chart.js/helpers` (works for any CSS colour, not just hex).
- **No legend** — native: Legend plugin simply not registered.

## Survival

- **Step-after line** — native: `stepped: 'before'`. Chart.js names the step by where the *vertical* segment sits relative to the next point: `'before'` (= `true`) draws horizontal-then-vertical (`lineTo(target.x, previous.y)`), which is d3's `curveStepAfter`. `'after'` is the opposite (d3 step-before) — the names are inverted versus d3, easy to get wrong.
- **Confidence band** — native: two extra line datasets (upper with `fill: '+1'`, lower), both `stepped: 'before'`, `borderWidth: 0`, filled by the Filler plugin at 15% alpha. The filler handles stepped boundaries correctly in both directions.
- **Censoring ticks** — native: a separate dataset of just the censored points, `showLine: false`, `pointStyle: 'line'`, `rotation: 90`, `pointRadius: 4` → a vertical ±4 px stroke (Chart.js draws `line` style as ±radius along the rotation). No custom plugin needed.
- **Axes 0..last x / 0..1, "Days"/"Survival"** — native: `min`/`max` + `title`. Chart.js always adds the max (412) as a tick and drops 400 to avoid overlap.
- **Tooltip: pointer x + each series' value** — composed. No built-in mode fits: `'index'` pairs points by array index (series have different x grids), `'x'` only matches point hit-boxes. Registered a custom interaction mode (`Interaction.modes.stepX`, the documented extension point, typed via `InteractionModeMap` augmentation) that bisects each labelled dataset's point elements for the last step ≤ pointer. The title "Day N" needs the pointer x, which no tooltip callback receives; `onHover` (runs before the tooltip's `afterEvent`) stores it in a ref. A custom positioner `'pointer'` returning the event position makes the tooltip follow the mouse and, importantly, re-render (and re-read the title) while moving within the same step — with the default `'average'` positioner the tooltip only updates when the active elements change.

## Scatter

- **Circle radius = `point.size`, 70% opacity** — native: `pointRadius` is an *indexable* option, so `pointRadius: s.points.map(p => p.size)` (an array, no scriptable function per point); `pointHoverRadius` set to the same array, otherwise hovered points jump to the 4 px default.
- **Nice linear axes, "X"/"Y"** — native: linear scale default `bounds: 'ticks'` rounds to tick values.
- **Tooltip: nearest point's series id and x, y** — native: `interaction: { mode: 'nearest', intersect: false }` + `label` callback.
- Points at the axis edge are clipped by the chart area (default `clip`); the SVG reference lets them overflow. Left as Chart.js default.

## Casts

- None. No `as` in charts.tsx; `!` used twice (`chart.scales.x!` — the record type is `{[id]: Scale}`; `points[mid]!` under `noUncheckedIndexedAccess`).

## Gotchas

- `stepped` naming (above).
- `parsing: false` reads `x`/`y` keys verbatim, so the band datasets (`lower`/`upper`) must be remapped to `{x, y}` first.
- With `parsing: false`, `ChartData<'line'>` still accepts our `SurvivalPoint[]` structurally (it extends `Point`), so no wide/long reshaping beyond the band.
- Line charts default to a `category` x scale; `type: 'linear'` is required on x or numeric `{x}` data is plotted by index.
- react-chartjs-2 re-runs `chart.update()` whenever the `data`/`options` object identity changes, so both are memoised. Its `plugins` prop is read only at construction.
- Custom interaction modes and positioners are global registrations (module scope), not per chart.
- Default `pointHoverRadius` (4) overrides the per-point radii on hover unless set.

## Settle mode: `signal`

- Hook: an inline plugin's `afterRender` (passed via react-chartjs-2 `plugins`), guarded to call `onSettled()` once. With `animation: false` Chart.js draws synchronously inside `new Chart()` (react-chartjs-2 constructs it in `useEffect`), and `afterRender` fires right after that draw.
- Evidence: in Playwright (dev server) I wrapped `requestAnimationFrame` and, on each call, counted non-transparent pixels of the canvas via `getImageData`, logging the caller stack. The rAF requested from `BenchStage.requestSettle` ← `afterRender` (charts.tsx) saw **79,197 / 540,000** non-transparent pixels for survival/typical and **52,417 / 540,000** for scatter/typical; the only earlier rAF (Playwright's own polling, before the chart existed) saw 0.

## Dev-mode mount times (`bench:mount`, ms, 3 runs: mount + 2 remounts, Vite dev server, headless Chromium)

| chart | typical | heavy |
| --- | --- | --- |
| survival (3×200 / 6×1000) | 26.5, 31.5, 32.1 | 32.7, 28.7, 30.0 |
| scatter (500 / 10 000) | 27.1, 33.0, 32.1 | 97.8, 75.3, 72.0 |

Dev numbers only; not comparable to the production benchmark.
