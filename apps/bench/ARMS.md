# Writing a library arm

Each library gets one file, `src/arms/<arm>/charts.tsx`, exporting `arm: Arm` (see `src/data/contract.ts`). `src/arms/none/charts.tsx` is the reference for what the charts must show. Use it to check what the charts look like, but don't copy its code. Write each chart the way that library's docs say to.

## Both charts

- The chart is exactly `width × height` (900 × 600). Use `MARGIN` from `src/data/spec.ts` for the plot area, or the library's closest equivalent.
- **Animation off.** Turn off every transition and animation the library has, including any initial "grow in" effect.
- Draw axes with ticks and labels, plus horizontal grid lines.
- Show a tooltip on hover. Use whatever the library offers natively; build a custom one only if it has none.
- Take colours from `series[i].color`.
- No legend.

## Survival chart (`Survival`)

- A step-after line per series (the value holds until the next point).
- A confidence band per series: `lower`..`upper`, also step-after, filled at about 15% opacity.
- A censoring tick at every point with `censored: true`: a short vertical mark (±4 px) on the line.
- x axis: `0 .. last x`, labelled "Days". y axis: `0 .. 1`, labelled "Survival".
- Tooltip: the x under the pointer, and each series' value at that x.

## Scatter chart (`Scatter`)

- A circle per point with radius `point.size` px, coloured by its series, at about 70% opacity.
- Linear x and y axes, nicely rounded to cover the data, labelled "X" and "Y".
- Tooltip: the nearest point's series id and x, y.

## Settle mode

- `settleMode: 'raf'` is for renderers that output DOM/SVG synchronously when React commits.
- `settleMode: 'signal'` is for anything that paints after commit (Canvas renderers, async layout). Call `onSettled()` exactly once, when the chart is fully drawn: use the library's "finished"/"rendered" callback, or an effect that runs after its draw. Write in `NOTES.md` which hook you used and how you checked that the canvas really had pixels at that moment.

## NOTES.md (one per arm) — feeds the article

- Version used.
- For each requirement above: **native** (a documented feature), **composed** (built from the library's own primitives or documented extension points, such as a custom layer, render prop or plugin), or **hand-drawn** (bypassed the library: raw SVG/canvas outside those extension points). Composed may still include authored drawing or interaction code; these labels describe integration, not effort. Add one line saying how.
- Every bare `as` cast you needed, and why.
- Gotchas, defaults that hurt performance, silent failures, and data-shape mismatches (for example, the library wants wide data and we have long data).
- Settle mode, and the evidence for it.
