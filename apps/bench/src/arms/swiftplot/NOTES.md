# swiftplot arm

- swiftplot 0.5.0 from npm, no other package. Its README calls it a prototype.
- 19.3 KB gzip for the survival and scatter page; 15.3 to 20.1 KB per gallery type (`results/gallery-bundle.json`).
- React wrapper (`shared.tsx`): a `Plot` component calls `plot(div, options)` on mount, `chart.update(options)` when the options change and `chart.destroy()` on unmount. `@swiftplot/react` has a `Plot` component that does the same; it is not used, to keep the arm on one package.
- `plot()` reads `use` once, so the tooltip passed to it forwards to the tooltip of the latest render.

## Requirements

- **900 × 600, MARGIN**: native (`width`, `height`, `margin`).
- **Animation and effects**: native. On, `animate()` is added to `use` and `dim: 0.3` fades every other group while one is under the pointer. Off, no `animate()` and `dim: 1`.
- **Axes, ticks, labels, horizontal grid**: native. Grid lines and tick marks on the canvas, labels as DOM.
- **Tooltip**: native, the imported `tooltip()` feature. `mode: 'x'` lists every labelled series at the pointer's x with a dashed crosshair; `mode: 'nearest'` gives one line of text for what is within 20 px.
- **Step-after line, band, censoring ticks**: native marks (`line` and `area` with `curve: 'step'`, `ticks`).
- **Circle per point**: native mark (`dots`).

## Gallery

| type         | how                                                                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| stacked-bar  | native: `bar` with a `stack` id on a `band` axis                                                         |
| stacked-area | native: `area` with a `stack` id on a `band` axis                                                        |
| donut        | native: `arcs` with `inner` in a polar frame                                                             |
| radar        | native: `radar`, with `max` and `fill` set to the shared values                                          |
| combo        | native: `bar` and a `line` with `yAxis: 'y2'` on a second y axis, which runs from 0 to the largest value |
| heatmap      | native: `heatmap` with a `sequential` scale on two `band` axes                                           |
| treemap      | native: `treemap` in a blank frame                                                                       |
| sankey       | native: `sankey` in a blank frame                                                                        |
| boxplot      | native: one `box` per group from the shared `boxplotStats`, outliers as `dots`                           |
| candlestick  | native: `candlestick` with `down` for the falling colour                                                 |

## Deviations

- **Scatter**: below 20,000 points in total, one fill per series means circles overlapping within a series don't darken each other (as in the uPlot arm). From 20,000 on WebGL every point blends, like the SVG reference.
- **Axes**: nice axes aim at 10 ticks or fewer with a 1/2/5 step, so tick steps differ from the reference. There is no axis line on the left.
- **Marks are clipped** to the plot area, and step x positions snap to whole device pixels.
- **Stacked area**: drawn on a band axis, so the first and last categories sit half a band in from the plot's edges.
- **Treemap**: one colour per branch with leaf names written in the rectangles; the reference colours each leaf by its value and writes nothing. The layout is swiftplot's own.
- **Sankey**: swiftplot's own layout, with node names beside the nodes.
- **Box plot**: boxes are filled faintly and outlined in the group's colour; the reference fills solidly with a dark outline.
- **Heatmap**: `heatmap()` puts row 0 at the bottom, so the rows and the y categories are reversed before they are passed in.
- **Tooltips** are one line of text each, where the reference has several. The stacked-area tooltip reads the nearest category through `snap`. The bar + line tooltip names only the mark that was hit.

## Casts

- `as Extract<TooltipOptions, { mode: M }>` in `live()`, to forward a tooltip by its mode.
- `!` on `ref.current`, on `Map.get` for a link's node, and on indexed access.

## Settle mode: `signal`

- `plot()` and `update()` draw synchronously, so the wrapper calls `onSettled()` on the line after. Checked with 0.1.1 on 2026-11-23 in the built playground: every type was fully drawn at its typical size beside the no-library arm. With 0.5.0 each type ran at its largest sample without an error on 2026-11-25.
- WebGL caveat: `drawArrays` returns before the GPU has drawn, and the CPU throttle slows only the main thread. With the prototype, a temporary `gl.readPixels` after the draw moved scatter/huge `mountMs` from 27.7 to 31.3 ms at native speed and from 59.4 to 81.4 ms at 4×. The forced read is itself a stall a normal frame doesn't pay, so the real cost lies between the two.

## Measured 2026-11-26 with 0.5.0

Nine loads per cell on a busy machine (load average 4–9). Typical and heavy are from the published run of all arms (`results/report.md`); huge is a separate run of these three arms straight after it.

`mountMs`, median:

| case             | swiftplot | uPlot | no library | swiftplot, 4× | uPlot, 4× | no library, 4× |
| ---------------- | --------: | ----: | ---------: | ------------: | --------: | -------------: |
| survival typical |      31.0 |  23.5 |       27.6 |          41.6 |      55.3 |           32.1 |
| survival heavy   |      26.1 |  28.4 |       27.4 |          50.7 |      69.0 |           58.8 |
| survival huge    |      29.5 |  52.1 |       80.5 |          81.3 |     194.6 |          340.4 |
| scatter typical  |      27.9 |  27.4 |       25.6 |          37.0 |      57.9 |           36.8 |
| scatter heavy    |      26.3 |  30.4 |       32.1 |          45.6 |      76.3 |          133.2 |
| scatter huge     |      26.7 |  32.7 |      251.0 |          61.8 |     125.6 |        1,049.0 |
