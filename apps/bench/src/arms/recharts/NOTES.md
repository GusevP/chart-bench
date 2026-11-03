# Recharts arm

Version: `recharts` 3.10.1 (React 19). Fixed `width`/`height` on the chart root, no `ResponsiveContainer`.

## Requirements

### Both charts

| Requirement | How | Notes |
| --- | --- | --- |
| 900 × 600, plot area = `MARGIN` | composed | Recharts lays the axes out *inside* `margin`, so passing `MARGIN` as-is gives a plot area of `MARGIN` + axis boxes (default YAxis width 60, XAxis height 30). Used `margin={{ top, right, left: 0, bottom: 0 }}` plus `YAxis width={MARGIN.left}` and `XAxis height={MARGIN.bottom}`. |
| Animation off | native | `isAnimationActive={false}` on every `Area`, `Line`, `Scatter` and `Tooltip`. Recharts 3 defaults it to `'auto'` (on unless reduced motion). |
| Axes, ticks, labels, horizontal grid | native | `XAxis`/`YAxis` with `label` objects; `<CartesianGrid vertical={false} />`. |
| Tooltip on hover | native | `<Tooltip>`. |
| Colours from `series[i].color` | native | `stroke`/`fill` per graphical item. |
| No legend | native | no `<Legend>` rendered. |

### Survival

| Requirement | How | Notes |
| --- | --- | --- |
| Step-after line | native | `<Line type="stepAfter">`. |
| Confidence band, step-after, 15% | native | `<Area type="stepAfter" dataKey={r => [lo, hi]}>` — a `dataKey` returning a `[min, max]` tuple is Recharts' range area. `tooltipType="none"` keeps bands out of the tooltip. |
| Censoring ticks ±4 px | composed | `Line`'s `dot` prop as a render function: returns a `<line>` for censored rows, `null` otherwise. |
| x `0..last x` "Days", y `0..1` "Survival" | native | `domain={[0, lastX]}` / `domain={[0, 1]}`. |
| Tooltip: x and each series' value | native, after reshaping data | Shared tooltip with `labelFormatter` (`Day N`) and `formatter` (3 decimals). Snaps to the nearest data x, not the continuous pointer x. |

### Scatter

| Requirement | How | Notes |
| --- | --- | --- |
| Circle radius `point.size`, 70% opacity | composed | `shape` render function returning `<circle r={payload.size}>`. The native size channel (`ZAxis`) maps a value linearly onto symbol *area* within a `range`, so it can't express "radius = size px". |
| Nicely rounded linear axes "X"/"Y" | native | `type="number"`, `domain={['auto', 'auto']}` (nice ticks; here it produced 0..100 on both). |
| Tooltip: series id, x, y | composed | Default scatter tooltip shows only the axis values — the `Scatter`'s `name` never reaches the payload. Gave each `Scatter` `id={series.id}` (its `graphicalItemId`) and rendered the stock `DefaultTooltipContent` via `content` with `label={payload[0].graphicalItemId}`. Triggers on hovering a circle (item hit test), not nearest point within a radius. |

Nothing hand-drawn.

## Data shape

- **Survival had to be reshaped from long to wide.** Per-item `data` (`<Line data={s.points}>`) renders correctly, but the shared tooltip looks rows up by *exact* x, so it only listed series that happened to have a point at the hovered x (2 of 3 in the first try). Fix: `toWideRows` builds one row per distinct x across all series with `y{i}`/`lo{i}`/`hi{i}`/`c{i}` keys, forward-filling each series (step-after semantics) up to its own last point. Cost measured in Node: typical 600 points → 365 rows, ~0.2 ms; heavy 6 000 points → 1 981 rows, ~2.5 ms. Also costs type safety: rows are `{ x: number; [key: string]: number | boolean }` and series are addressed by stringly-typed index keys.
- Scatter kept the long format: one `<Scatter data={s.points}>` per series, no reshape.

## Casts

None. `DotItemDotProps.payload` and the tooltip payload are typed `any` by Recharts, so the index into the wide row and `payload.size` compile without a cast (and without checking).

## Gotchas

- `margin` is outside the axes, not around the plot area (see above) — easy to get a plot area ~60 px narrower and ~30 px shorter than intended without noticing.
- Recharts 3 animation default is `'auto'`, not `false`; every graphical item and the Tooltip need it turned off individually.
- With `dot` as a function, Recharts calls it for every row of every series (here ~2 000 × 6 on heavy), even though only ~8% return an element.
- A Scatter's `name` doesn't appear anywhere in its tooltip; the series identity is only available as `graphicalItemId`.
- Shared tooltip + per-item data silently drops series (no warning) when x values don't align across series.

## Settle mode: `raf`

Recharts 3 does **not** render the chart on the first commit: a `useLayoutEffect` in the parent probed during the first commit saw 0 `path`/`line`/`circle` nodes inside the stage (the series register in a Redux store from effects, then the chart re-renders). But those follow-up renders are synchronous within the same task:

- A `MutationObserver` on the stage saw exactly **one** mutation batch per mount, at every size (one task, before any frame).
- The DOM count at `benchStageSettled` equalled the count 800 ms later (survival typical 70, heavy 497; scatter typical 517, heavy 10 017), and the last mutation landed 1–9 ms *before* the `bench:settled` mark.

So the double rAF from the stage's layout effect always lands after the fully filled SVG, and `raf` measures the complete chart. There is no Recharts "rendered" callback to hang `signal` on anyway.

## Dev-mode mount times (sanity only)

`vite` dev server, headless Chromium, `performance.getEntriesByName('bench:mount')`, 3 runs:

| Chart | typical | heavy |
| --- | --- | --- |
| Survival | ~70 ms | ~247 ms |
| Scatter | ~100 ms | ~550–575 ms |
