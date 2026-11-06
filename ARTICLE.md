# Your chart benchmark is probably lying: 6 React chart libraries vs hand-written SVG, measured fairly

*Draft. Every bench table below comes from a [chart-bench](https://github.com/GusevP/chart-bench) run on 2026-11-06 on a machine with other work running, not an idle one; [the Runs section](#the-setup) gives the load. Clone it and you can reproduce all of them, though not these exact timings.*

## Why I measured this

I work on a data-heavy analytics product with about sixteen charts: survival curves, forest plots, histograms and scatter plots. Our charting library had not published a release in over a year. That isn't a crisis today, but a library that stops shipping eventually leaves you stuck on an old React major or with an unpatched CVE. So the question was what to move to.

Every "React chart library comparison" I found was a feature checklist, or a single `console.time` around a render. I wanted numbers I could defend in a design review. Getting them took more work on the stopwatch than on the charts.

## The setup

**Two charts, seven implementations.** Both charts are taken from the real product, with synthetic data:

- **Survival curve:** step-after lines, a shaded confidence band per series, small vertical ticks for censored observations, and a tooltip that shows every series' value at the pointer's x.
- **Scatter plot:** circles sized per point and coloured per group, with a nearest-point tooltip.

| arm | renderer | version |
| --- | --- | --- |
| `none` | React and hand-written SVG, no d3 or chart package | — |
| `nivo` | SVG | 0.99.0 |
| `recharts` | SVG | 3.10.1 |
| `echarts` | Canvas | 6.1.0 |
| `visx` | SVG primitives | 4.0.0 |
| `tanstack` | TanStack Charts, SVG mark grammar | 1.2.0 |
| `chartjs` | Chart.js + react-chartjs-2, Canvas | 4.6.1 |

Every port was written against [one written spec](apps/bench/ARMS.md): exact size and margins, the same marks and the same tooltip content, with animation and hover effects off on every timed page. (The playground has a toggle that turns them on; `none` ignores it, because effects there would have to be hand-written.) Each was checked visually against the no-library baseline at the same seed. The spec also says how each library should be used: what its docs recommend, with nothing hand-drawn where the library has a native way. Each library arm's `NOTES.md` records, requirement by requirement, whether the library did it **natively**, whether it had to be **composed** from the library's own pieces, or whether it had to be **hand-drawn** around the library.

**Data:** seeded generators, so every library gets byte-identical input.

| | survival | scatter |
| --- | --- | --- |
| typical | 3 series × 200 points | 500 points |
| heavy | 6 series × 1,000 points | 10,000 points |

**Runs:** production build (`vite build` + `vite preview`), headless Chromium driven by Playwright, one worker. Each cell gets one warm-up load and then 9 measured page loads, reported as the median ± half the IQR. One run is at native speed. A second run uses Chrome's 4× CPU throttle, roughly a mid-range phone, because at native speed almost all the typical charts finish inside one frame (more below). Apple M3 Pro (11 cores), macOS 27.

**Conditions: this was not a quiet machine.** I ran these on 2026-11-06 with other work running. Load averages (1 min) were 4.12 before and 4.66 after the native run, and 6.83 after the throttled run, which started as the native one ended.

To see how far the numbers moved I compared them with the quieter 2026-11-03 runs (`apps/bench/results/run-1x.md`, `run-4x.md`). Six arms draw the same charts in both, with identical DOM node counts. Their timed pages did change: all of them go through a reworked `ArmPage.tsx`, five (all but visx) gained effects flags that are off on these pages, and TanStack renders through a wrapper that also loads `motion`. The clock skips module evaluation, but the reworked page, the flag checks and the wrapper all run after it starts. Machine load changed as well. So the table shows how far medians moved between the two dates, and it can't show how much of that came from code and how much from load:

| six arms, median mount time, 2026-11-06 ÷ 2026-11-03 | native | 4× throttle |
| --- | ---: | ---: |
| heavy cells | 0.98–1.50× | 0.93–1.16× |
| typical cells | 0.85–1.57× | 0.81–1.50× |

The worst typical moves are both nivo's survival chart: 14.9 → 23.4 ms at native speed and 41.7 → 62.7 ms at 4×. The heavy high at native speed is ECharts' survival chart (32.5 → 48.8 ms); it and ECharts' heavy scatter (70.3 → 85.6 ms, 1.22×) are the only heavy cells past 1.16×, and both moved by less than one frame. The two dates differ in both code and load, so these ranges are not a noise measurement, and I don't have one. For comparing libraries I use an editorial rule instead: **a gap on a heavy chart under 20%, or any gap under one frame, is a tie**, and the typical columns get bands at most, not a ranking. The 20% is my choice, set above the 1.16× that every other heavy cell stayed within. It is not a measured bound.

The table leaves out the `none` arm, which was rewritten between the two dates. On the heavy scatter it went 92.5 → 103.6 ms at 4×, which is 1.12× and inside the range of those six arms' heavy cells. At native speed the same cell went 29.6 → 23.7 ms. Neither move has a clean reading, for the same reason: code and load both changed. The bench also runs `none` near the start, so its throttled cells ran nearest the 4.66 load reading, while the six arms ran later as load rose to 6.83. The two aren't like for like, so this run can't settle whether the rewrite changed its speed.

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

The cost of this design: the instrument is **frame-quantised**. An empty page with no chart measured about 22–26 ms at native speed, roughly 1.3–1.6 frames of pure overhead. Anything less than one frame (16.7 ms) apart is a tie.

## What a naive stopwatch would have told me

To show why this matters, the harness also records the timestamp a simpler instrument would take: at React's commit for SVG charts, and at the library's "done" callback for Canvas. Same runs, same page loads, two clocks:

| 10,000-point scatter (native speed) | naive | paint-confirmed |
| --- | ---: | ---: |
| no library | 13.7 ms | 23.7 ms |
| nivo | 279.0 ms | **3,236.5 ms** |
| **Recharts** | **1.0 ms** | **309.6 ms** |
| ECharts | 82.9 ms | 85.6 ms |
| Chart.js | 71.6 ms | 80.2 ms |

**The naive clock ranks Recharts as the fastest library on the stand. It is actually the second slowest.** Recharts 3 commits an empty chart first, then fills it in a second render pass within the same task, before any frame is painted. A timestamp taken in a `useLayoutEffect` at commit sees almost none of the work.

nivo shows the same thing at a different scale: the naive clock catches about 9% of the cost.

For Canvas the two clocks are close, because the library's own "done" callback is honest. The trap is the other way round: had I marked straight from that callback instead of going through the same rAF as SVG, every Canvas library would have got a free frame.

## Results

### Mount time, 4× CPU throttle (median ms; empty page ≈ 21–25 ms)

| library | survival typical | survival heavy | scatter typical | scatter heavy |
| --- | ---: | ---: | ---: | ---: |
| no library | 21.3 | 27.2 | 23.2 | 103.6 |
| visx | 22.2 | 51.7 | 21.3 | 127.9 |
| TanStack Charts | 20.9 | 90.6 | 20.1 | 195.9 |
| Chart.js | 32.7 | 60.2 | 36.8 | 318.1 |
| ECharts | 49.2 | 123.7 | 48.0 | 260.9 |
| nivo | 62.7 | 149.7 | 134.8 | **14,899.8** |
| Recharts | 103.1 | 446.1 | 111.7 | 1,195.8 |

Bold marks nivo's heavy-scatter cost. On the heavy scatter, the no-library arm is 23% ahead of visx and ECharts is 22% ahead of Chart.js. Both gaps are just past the 20% line, and in an earlier run the same day (`loaded-20261106-4x.md`) both pairs were inside it, at 8% and 18%, so I still read them as ties. On the heavy survival chart the no-library arm has the lowest median, but that cell is unstable (±5.8 ms): two of its nine runs landed at 53–55 ms, inside visx's range, and the same cell also split into two clusters on 2026-11-03. So that isn't a clean lead, and visx and Chart.js tie with each other. In the typical columns, the no-library arm, visx and TanStack form one band; Recharts and nivo's scatter sit clearly above it.

At native speed on an M3 Pro, the typical charts in each column all sit within one frame of each other, at 19–37 ms overall; nivo's typical scatter is the highest, at 36.6 ms. So for typical dashboard sizes on a developer laptop, speed barely separates them. The heavy scatter still does: 10,000 points take 24 ms with hand-written SVG and 33 ms with visx (a tie), 53 ms with TanStack, 80–86 ms with the two Canvas libraries, 310 ms with Recharts and **3.2 s with nivo**. nivo's cost holds even with animation off: it still routes every node through its spring-transition machinery on mount.

**Canvas wasn't automatically faster.** At 10,000 points, ECharts and Chart.js both lost to plain SVG and to visx, at both CPU speeds, by about 2× or more.

### Hover: longest frame during a 60-step pointer sweep, 4× throttle

Most cells are a clean 16.8 ms (one frame). On the 10,000-point scatter the exceptions are Recharts at **133.3 ms** (8 frames), Chart.js and visx at 50 ms, and the no-library arm and TanStack at 33 ms; nivo and ECharts stay at one frame. nivo hit-tests against a precomputed Voronoi mesh, which is its one clear win. Elsewhere, nivo, ECharts, visx and Chart.js take 33 ms on the heavy survival chart, and TanStack takes 33 ms on the typical scatter. At native speed only Recharts drops a frame (33 ms), on the 10,000-point scatter.

Hover barely moved between the two dates. Against 2026-11-03, three cells in the six comparison arms flipped by one frame: Chart.js's 10,000-point scatter at native speed went from 33.3 to 16.8 ms, and at 4× Recharts' 10,000-point scatter went from 116.7 to 133.3 ms and TanStack's typical scatter from 16.8 to 33.2 ms. Code and load both changed, so those flips have no known cause. Hover is frame-quantised, so read a one-frame difference here as a tie.

### Weight and code

| library | library cost (gzip) | code tokens for both charts | DOM nodes, 10k scatter |
| --- | ---: | ---: | ---: |
| no library | **2.2 KB** | 3,134 | 10,075 |
| visx | 25.0 KB | 1,683 | 10,117 |
| Chart.js | 55.6 KB | 1,214 | 2 (canvas) |
| TanStack Charts | 56.8 KB | **720** | 10,055 |
| nivo | 103.1 KB | 993 | 10,094 |
| Recharts | 106.2 KB | 1,064 | 30,109 |
| ECharts | 164.2 KB | 1,117 | 5 (canvas) |

*Library cost* is the gzipped JS each page loads minus an identical page with no chart library; for the no-library arm, that is its own chart code. *Code tokens* count both charts including tooltips, after TypeScript normalises the code to JS/JSX, excluding imports, comments and whitespace. A chart pays for every file it reaches, so the no-library arm's 3,134 tokens include its own scales, step paths, axes and tooltip, and also the category axes in its axis file that only the playground's other charts use. Read the gap to 720–1,683 as an upper bound on what a library saves you on these two charts.

TanStack's cost includes about 15 KB for the `motion` renderer. Only the playground's effects mode uses it, but the arm imports it statically, so timed pages load it too, and that puts TanStack just behind Chart.js on weight.

None of the seven ports needed a narrowing `as` cast (the only `as` is one `as const` in ECharts), and none of the six libraries needed anything hand-drawn outside its own extension points. The differences are in what had to be *composed*.

## What each library made me do

- **nivo:** bands and censoring ticks had to be custom layers. The linear scale is `nice` by default and silently stretched the x axis from 412 to 450. Slices only group points that share an exact x, so the survival tooltip had to be my own lookup.
- **Recharts:**
  - Survival data had to be reshaped from long format into one row per x, forward-filled. Without that, the shared tooltip **silently drops** any series without a point at exactly that x.
  - Animation defaults to `'auto'` and has to be turned off on every element separately.
  - It renders three DOM nodes per scatter point.
- **ECharts:**
  - A **misspelled top-level option key type-checks cleanly**, because the option type has an index signature. At runtime it throws inside `setOption`. Misspelled nested keys are ignored silently.
  - For large series the defaults switch on progressive rendering. On a 50,000-point test series, a dev-mode check measured 2.4 s instead of 0.4 s.
- **visx:** everything is composed from primitives, and hit-testing is your own code. You get exactly what you write: it ties the no-library baseline at native speed. Throttled, it is 23% behind on the heavy scatter, which I read as a tie (see Results). On the throttled heavy survival chart its median is higher, but two of the no-library arm's nine runs there landed in visx's range.
- **TanStack Charts 1.2:**
  - A mark grammar in the Observable Plot lineage. Censoring ticks are a stock `tickX`, and the band is `areaY` with `y1`/`y2`.
  - It needed 720 tokens against nivo's 993 and Recharts' 1,064.
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

- **Don't use nivo for large point counts.** 10,000 points took 3.2 s at native speed and 14.9 s throttled, with animation off. It's fine for small charts, but it has had no npm release since May 2025.
- **Recharts is the risky default.** It is widely used, but it was the slowest library on the heavy survival chart (446 ms throttled, nivo 150 ms) and second slowest on the heavy scatter, the worst on hover (8 frames throttled), and it needs data reshaping that fails silently when skipped.
- **Canvas isn't a shortcut.** At 10,000 points ECharts and Chart.js took about twice as long or more to mount as plain SVG, at both CPU speeds. ECharts' hover stayed smooth, at 164 KB.
- **For the least code, TanStack Charts 1.2:** 720 tokens, the fewest, and 57 KB, mounting behind visx and plain SVG on the heavy scatter at both speeds, nearly every requirement native. The risk is age: its first release was in July 2026.
- **For control and size, visx, or no library at all.** They are the two fastest on the 10,000-point scatter at both speeds (throttled, plain SVG is 23% ahead, which I read as a tie) and are the smallest (2–25 KB), and you own every mark, tooltip and hit-test. That costs code: 3,134 tokens with no library, a count that includes axis code for the playground's other charts, and 1,683 with visx.

The bigger lesson is about the stopwatch, not the libraries. **Measure to the paint, and put SVG and Canvas through the same final step.** Mine nearly ranked the second-slowest library first.

## Limitations

- One machine, one browser engine (Chromium), headless. Frame-quantised: differences under 16.7 ms are ties.
- The bench timings come from a machine with other work running. Cells in the six comparison arms moved up to 1.50× on heavy charts and 1.57× on typical ones against the quieter 2026-11-03 runs, whose timed code also differed, so those figures are not noise bounds.
- Two chart types. A bar-heavy or dual-axis product could rank differently.
- "Code tokens" measures what this spec needed, written idiomatically per the docs, plus for the no-library arm the shared axis code added for the playground's other charts. A more experienced user of one library might do it in fewer.
- Hover is a scripted sweep, not real input latency.

## Try it

The repository has the harness, all seven ports, raw JSONL for every run and the scripts that build these tables. [`bench-stage`](packages/bench-stage) is a standalone package: wrap any React component in `<BenchStage>` and drive it from Playwright. The [playground](README.md#playground) lets you load your own data and measures each library alone in a visible frame, with a fresh page load per run.
