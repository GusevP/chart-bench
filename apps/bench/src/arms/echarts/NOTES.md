# ECharts arm

- **Version:** `echarts` 6.1.0, Canvas renderer. No React wrapper: `EChart` in `charts.tsx` calls `init` in an effect, then `setOption`, and calls `dispose` in the effect's cleanup.
- **Imports:** tree-shaken via `echarts/core` + `use([LineChart, ScatterChart, GridComponent, TooltipComponent, CanvasRenderer])`. The `echarts` barrel is never imported.

## Requirements

| Requirement | How | Notes |
| --- | --- | --- |
| 900 × 600, `MARGIN` plot area | native | `init(el, null, { width, height })`; `grid: { ...MARGIN, outerBoundsMode: 'none' }`. `outerBoundsMode: 'none'` is the v6 replacement for `containLabel: false`, so the grid is exactly `MARGIN`. |
| Animation off | native | `animation: false` at the top level covers the initial grow-in and updates too. |
| Axes, ticks, labels, horizontal grid | native | Value axes. `axisLine.show` is off by default on value axes, so it is turned on. The x `splitLine` is turned off so only horizontal grid lines remain. Axis titles use `name` + `nameLocation: 'middle'` + `nameGap`. |
| Tooltip | native | `TooltipComponent`, with a `formatter` that sets the text. |
| Colours from `series[i].color` | native | Per-series `color`. |
| No legend | native | `LegendComponent` is not registered. |
| Survival step-after line | native | `type: 'line', step: 'end'`. Checked with a 2-point dataset: the line holds at y=1 until x=100, then drops. |
| Survival CI band, step-after, 15% | composed | The same stacked-area recipe as ECharts' "Confidence Band" example: a hidden `lower` series, then `upper − lower` stacked on it (`stack: band-<id>`) with `areaStyle.opacity: 0.15`, both `step: 'end'`. The library has no band/range-area series, so long data must be split into two derived series. |
| Censoring ticks ±4 px | composed | A `scatter` series per arm with `symbol: 'rect', symbolSize: [1, 8]`, `silent: true`. |
| x `0..last x` "Days", y `0..1` "Survival" | native | `min`/`max` on the axes. `axisLabel.hideOverlap: true` stops the forced max label (412) from overlapping the 400 tick. |
| Survival tooltip: x under pointer + each value | composed | `trigger: 'axis'` with `axisPointer.snap: false` gives the pointer's x as `axisValue`. Out of the box it reports each series' *nearest* point and would also list the band helper series. A `formatter` does a step-after lookup (binary search) per series instead. |
| Scatter circles, radius = size, 70% | native | `symbolSize: (v) => v[2] * 2` (ECharts' symbolSize is a diameter), `itemStyle.opacity: 0.7`. |
| Scatter "nice" axes "X"/"Y" | native | `scale: true` (do not force zero). ECharts' nice ticks round the extent out to 0..100 for this data. |
| Scatter tooltip: series + x, y of nearest point | native | `trigger: 'item'` hit-tests the symbol under the pointer (not the nearest within a radius). The formatter only formats the text. |

Hover was checked in a real browser: survival showed "Day 172 / Arm A: 0.765 / Arm B: 0.801 / Arm C: 0.767" (`survival-hover.png`), and scatter showed "Group 2: (30.4, 46.8)" (`scatter-hover.png`).

## Casts

- None. The only `as` is `as const` on the shared axis object, which keeps literal types like `type: 'value'`.
- The tooltip formatter's params type (`CallbackDataParams`) does not declare `axisValue`, even though axis-trigger params carry it at runtime. It is narrowed with `'axisValue' in first` instead of a cast.

## Gotchas

- **Typos.** The top-level `ECBasicOption` has an index signature, so a **misspelled top-level key (`xAxsi`) typechecks cleanly**. At runtime it **throws** `xAxis "0" not found` from inside `setOption`. React then unmounts the tree, so the page goes blank. Even so, `benchStageSettled` still became `true`, so the harness would time a crashed chart. Nested typos (`nameGpa`, `lineStyle.widht`) are caught by `tsc` (TS2353/TS2561) because the series and axis option types are closed. At runtime they are silently ignored, with no console warning.
- **Band helper series leak into hover.** With `trigger: 'axis'`, the stacked band series showed emphasis dots in ECharts' *default palette* colours (yellow and cyan), even with `showSymbol: false` and `silent: true`. Setting `symbol: 'none'` on them was required. Without a formatter they would also appear as tooltip rows.
- **Large mode and progressive rendering.** Scatter defaults are `largeThreshold: 2000` and `progressiveThreshold: 3000`, both counted per series. The heavy dataset has 2000 points per series, so neither mode triggers there: pixels and mount time were identical with or without the overrides. The arm still sets `large: false, progressive: 0`. Large mode draws every point with one size, and progressive mode spreads the draw over frames. Test with one 50k-point series sent through `bench:data`:
  - With defaults, the points go to a separate incremental canvas layer (`zr_1.1`). `bench:mount` took **2444 ms** (progressive chunks across frames).
  - With `large: false, progressive: 0`, it took **407 ms**.
  - In both cases `finished` fired only after the *last* chunk. The pixel counts per canvas were the same at settle as 3 s later (`[2604, 398370]`), so `finished` never under-measures. Progressive mode just makes it slower.
- **Multiple canvases.** Above a few thousand elements ECharts draws the series on a second `<canvas>` layer. Any pixel check has to read every canvas, not `querySelector('canvas')`.
- **Data shape.** Long data maps naturally to `[x, y]` tuples per series. The only reshaping is the band, which needs `upper − lower` as a stacked delta.

## Settle mode: `signal`

- Hook: `chart.on('finished', …)`, registered before `setOption`, unregistered on first call, then `onSettled()`. `rendered` fires after every frame, including partial progressive frames. `finished` fires once the whole draw has completed.
- Evidence (Playwright, dev server):
  - `requestAnimationFrame` was wrapped, and the canvas was read with `getImageData` in the same synchronous tick that `onSettled` → `requestSettle` called rAF.
  - It counted non-white ("ink") and saturated ("colored") pixels, compared with the same counts 1 s later.

| Run | At `onSettled` (ink / colored) | 1 s later |
| --- | --- | --- |
| survival typical | 75086 / 37573 | 75086 / 37573 |
| scatter typical | 54017 / 47558 | 54017 / 47558 |
| survival heavy | 137822 / 104179 | 137822 / 104179 |
| scatter heavy | 164885 / 158385 | 164885 / 158385 |

The canvas is fully drawn when `onSettled` fires, and nothing changes afterwards.

## Dev-mode mount times (`bench:mount`, single runs, headless Chromium, `vite` dev)

| Chart | typical | heavy |
| --- | --- | --- |
| survival | 43–66 ms | 37–45 ms |
| scatter | 24–29 ms | 71–78 ms |

These are dev-mode numbers only. The real comparison is the production build run by the harness.
