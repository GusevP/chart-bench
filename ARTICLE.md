# Your chart benchmark is probably lying: 6 React chart libraries vs hand-written SVG, measured fairly

*Draft. Every number below comes from [chart-bench](https://github.com/GusevP/chart-bench), run on 2026-11-03. Clone it and you can reproduce all of them.*

## Why I measured this

I work on a data-heavy analytics product with about sixteen charts: survival curves, forest plots, histograms and scatter plots. Our charting library had not published a release in over a year. That isn't a crisis today, but a library that stops shipping eventually leaves you stuck on an old React major or with an unpatched CVE. So the question was what to move to.

Every "React chart library comparison" I found was a feature checklist, or a single `console.time` around a render. I wanted numbers I could defend in a design review. Getting them took more work on the stopwatch than on the charts.

## The setup

**Two charts, seven implementations.** Both charts are taken from the real product, with synthetic data:

- **Survival curve:** step-after lines, a shaded confidence band per series, small vertical ticks for censored observations, and a tooltip that shows every series' value at the pointer's x.
- **Scatter plot:** circles sized per point and coloured per group, with a nearest-point tooltip.

| arm | renderer | version |
| --- | --- | --- |
| `none` | React + d3-scale, hand-written SVG | — |
| `nivo` | SVG | 0.99.0 |
| `recharts` | SVG | 3.10.1 |
| `echarts` | Canvas | 6.1.0 |
| `visx` | SVG primitives | 4.0.0 |
| `tanstack` | TanStack Charts, SVG mark grammar | 1.2.0 |
| `chartjs` | Chart.js + react-chartjs-2, Canvas | 4.6.1 |

Every port was written against [one written spec](apps/bench/ARMS.md): exact size and margins, animation off, the same marks and the same tooltip content. Each was checked visually against the no-library baseline at the same seed. The spec also says how each library should be used: what its docs recommend, with nothing hand-drawn where the library has a native way. Each arm's `NOTES.md` records, requirement by requirement, whether the library did it **natively**, whether it had to be **composed** from the library's own pieces, or whether it had to be **hand-drawn** around the library.

**Data:** seeded generators, so every library gets byte-identical input.

| | survival | scatter |
| --- | --- | --- |
| typical | 3 series × 200 points | 500 points |
| heavy | 6 series × 1,000 points | 10,000 points |

**Runs:** production build (`vite build` + `vite preview`), headless Chromium driven by Playwright, one worker. Each cell gets one warm-up load and then 9 measured page loads, reported as the median ± half the IQR. One run is at native speed. A second run uses Chrome's 4× CPU throttle, roughly a mid-range phone, because at native speed the typical charts all finish inside one frame (more below). Apple M3 Pro, macOS 27.

## The stopwatch

"How long does the chart take" sounds simple. Here is the instrument, [`bench-stage`](packages/bench-stage/src/BenchStage.tsx), reduced to its core:

```tsx
// Both settle modes end in the same double rAF. Marking straight from `onSettled` would
// stop the clock before paint and hand Canvas charts a free frame over SVG ones.
const requestSettle = useCallback(() => {
  if (requestedRef.current) return;
  requestedRef.current = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      performance.mark('bench:settled');
      performance.measure('bench:mount', 'bench:start', 'bench:settled');
    });
  });
}, []);
```

Three decisions behind it:

1. **The chart isn't rendered on page load.** The runner calls `window.benchStage.mount()`, so module evaluation and hydration, which are the same for every library, stay out of the number.
2. **"Done" means painted, not committed.** The clock stops two animation frames after the chart reports done: the first frame lands after React's commit, the second after the browser paints it.
3. **SVG and Canvas report "done" differently but stop the clock the same way.** An SVG chart is done when React commits. A Canvas chart is done when the library says it has drawn: ECharts' `finished` event, or a Chart.js plugin's `afterRender`. Both paths then go through the *same* double rAF.

```ts
// Chart.js: the canvas is drawn inside the chart's own render cycle, not at React's commit.
const plugin: Plugin<'line'> = {
  id: 'benchSettled',
  afterRender: () => { if (!done) { done = true; onSettled(); } },
};
```

The cost of this design: the instrument is **frame-quantised**. An empty page with no chart measures about 20–24 ms at native speed, roughly 1.3 frames of pure overhead. Anything less than one frame (16.7 ms) apart is a tie.

## What a naive stopwatch would have told me

To show why this matters, the harness also records the timestamp a simpler instrument would take: at React's commit for SVG charts, and at the library's "done" callback for Canvas. Same runs, same page loads, two clocks:

| 10,000-point scatter (native speed) | naive | paint-confirmed |
| --- | ---: | ---: |
| no library | 17.9 ms | 29.6 ms |
| nivo | 252.6 ms | **3,077.7 ms** |
| **Recharts** | **0.9 ms** | **286.7 ms** |
| ECharts | 67.8 ms | 70.3 ms |
| Chart.js | 66.8 ms | 75.2 ms |

**The naive clock ranks Recharts as the fastest library on the stand. It is actually the second slowest.** Recharts 3 commits an empty chart first, then fills it in a second render pass within the same task, before any frame is painted. A timestamp taken in a `useLayoutEffect` at commit sees almost none of the work.

nivo shows the same thing at a different scale: the naive clock catches about 8% of the cost.

For Canvas the two clocks are close, because the library's own "done" callback is honest. The trap is the other way round: had I marked straight from that callback instead of going through the same rAF as SVG, every Canvas library would have got a free frame.

## Results

### Mount time, 4× CPU throttle (median ms; empty page ≈ 24–27 ms)

| library | survival typical | survival heavy | scatter typical | scatter heavy |
| --- | ---: | ---: | ---: | ---: |
| no library | 25.3 | **37.6** | 26.6 | **92.5** |
| visx | 25.7 | 55.7 | 26.1 | 115.4 |
| TanStack Charts | 25.8 | 83.7 | **24.0** | 180.0 |
| Chart.js | **23.3** | 56.4 | 34.0 | 294.1 |
| ECharts | 45.7 | 115.2 | 43.4 | 240.7 |
| nivo | 41.7 | 139.4 | 123.5 | **12,880.6** |
| Recharts | 94.3 | 412.4 | 101.9 | 1,110.0 |

At native speed on an M3 Pro, every library draws the *typical* charts within one frame of an empty page, so for typical dashboard sizes on a developer laptop, speed doesn't separate them. The heavy column still does: 10,000 points take 30 ms with hand-written SVG, 30 ms with visx, 50 ms with TanStack, 70–75 ms with the two Canvas libraries, 287 ms with Recharts and **3.1 s with nivo**. nivo's cost holds even with `animate={false}`: it still routes every node through its spring-transition machinery on mount.

**Canvas wasn't automatically faster.** At 10,000 points, ECharts and Chart.js both lost to plain SVG and to visx, at both CPU speeds.

### Hover: longest frame during a 60-step pointer sweep, 4× throttle

Most cells are a clean 16.8 ms (one frame). The exceptions, all on the 10,000-point scatter, are Recharts at **116.7 ms** (7 frames), Chart.js and visx at 50 ms, and no library and TanStack at 33 ms. nivo and ECharts stay at one frame. nivo hit-tests against a precomputed Voronoi mesh, which is its one clear win. At native speed only Recharts and Chart.js drop a frame (33 ms), both on the 10,000-point scatter.

### Weight and code

| library | library cost (gzip) | code lines for both charts | DOM nodes, 10k scatter |
| --- | ---: | ---: | ---: |
| no library | 11.5 KB | 197 | 10,073 |
| visx | 25.1 KB | 217 | 10,117 |
| TanStack Charts | 42.1 KB | **80** | 10,055 |
| Chart.js | 55.4 KB | 209 | 2 (canvas) |
| nivo | 103.2 KB | 125 | 10,094 |
| Recharts | 106.1 KB | 142 | 30,109 |
| ECharts | 164.0 KB | 156 | 5 (canvas) |

*Library cost* is the gzipped JS each page loads minus an identical page with no chart library. *Code lines* exclude comments and blank lines, after Prettier, for both charts including tooltips.

None of the seven ports needed a narrowing `as` cast (the only `as` is one `as const` in ECharts), and nothing was hand-drawn outside the library's own extension points. The differences are in what had to be *composed*.

## What each library made me do

- **nivo:** bands and censoring ticks had to be custom layers. The linear scale is `nice` by default and silently stretched the x axis from 412 to 450. Slices only group points that share an exact x, so the survival tooltip had to be my own lookup.
- **Recharts:**
  - Survival data had to be reshaped from long format into one row per x, forward-filled. Without that, the shared tooltip **silently drops** any series without a point at exactly that x.
  - Animation defaults to `'auto'` and has to be turned off on every element separately.
  - It renders three DOM nodes per scatter point.
- **ECharts:**
  - A **misspelled top-level option key type-checks cleanly**, because the option type has an index signature. At runtime it throws inside `setOption`. Misspelled nested keys are ignored silently.
  - For large series the defaults switch on progressive rendering. On a 50,000-point test series, a dev-mode check measured 2.4 s instead of 0.4 s.
- **visx:** everything is composed from primitives, and hit-testing is your own code. You get exactly what you write: it ties the no-library baseline at native speed and trails it by about a frame when throttled.
- **TanStack Charts 1.2:**
  - A mark grammar in the Observable Plot lineage. Censoring ticks are a stock `tickX`, and the band is `areaY` with `y1`/`y2`.
  - It needed 80 lines against nivo's 125 and Recharts' 142.
  - An earlier 0.x version I evaluated pre-rendered a hidden focus ring per data point. In 1.2 that's one empty `<g>`.
- **Chart.js:**
  - Covers almost everything natively, including censoring ticks as rotated `pointStyle: 'line'`.
  - Mind the naming: `stepped: 'before'` is what d3 calls step-*after*.
  - The survival tooltip needed a custom interaction mode.

```ts
// TanStack Charts: the survival chart's marks
marks: [
  decorative(areaY(rows, { x: 'x', y1: 'lower', y2: 'upper', z: 'series', fillOpacity: 0.15, curve: stepAfter })),
  lineY(rows, { x: 'x', y: 'y', z: 'series', curve: stepAfter }),
  decorative(tickX(rows.filter(r => r.censored), { x: 'x', y: 'y', z: 'series', length: 8 })),
],
```

## Conclusion

- **Don't use nivo for large point counts.** 10,000 points took 3.1 s at native speed and 12.9 s throttled, with animation off. It's fine for small charts, but it has had no npm release since May 2025.
- **Recharts is the risky default.** It is widely used, but it was the slowest library on the heavy survival chart (412 ms throttled, nivo 139 ms) and second slowest on the heavy scatter, the worst on hover (7 frames throttled), and it needs data reshaping that fails silently when skipped.
- **Canvas isn't a shortcut.** At these sizes ECharts and Chart.js were slower to mount than plain SVG. ECharts' hover stayed smooth, at 164 KB.
- **For the least code, TanStack Charts 1.2:** 80 lines, 42 KB, in the fast group behind visx and plain SVG, nearly every requirement native. The risk is age: its first release was in July 2026.
- **For control and size, visx, or no library at all.** They are the fastest and smallest (11–25 KB), and you own every mark, tooltip and hit-test.

The bigger lesson is about the stopwatch, not the libraries. **Measure to the paint, and put SVG and Canvas through the same final step.** Mine nearly ranked the second-slowest library first.

## Limitations

- One machine, one browser engine (Chromium), headless. Frame-quantised: differences under 16.7 ms are ties.
- Two chart types. A bar-heavy or dual-axis product could rank differently.
- "Code lines" measures what this spec needed, written idiomatically per the docs. A more experienced user of one library might do it in fewer.
- Hover is a scripted sweep, not real input latency.

## Try it

The repository has the harness, all seven ports, raw JSONL for every run and the scripts that build these tables. [`bench-stage`](packages/bench-stage) is a standalone package: wrap any React component in `<BenchStage>` and drive it from Playwright. The [playground](README.md#playground) lets you load your own data and measures each library alone in a visible frame, with a fresh page load per run.
