# Published results, 2026-11-06

Reconciled by hand from `fresh-20261106-1x.md` and `fresh-20261106-4x.md`.

They replace `loaded-20261106-*`, which were measured the same day before the behaviour-preserving refactor `fix: split none axes from Chart.tsx and trim linear.ts`.

**Conditions: not a quiet machine.** Both regimes ran on 2026-11-06 with other work running, on an Apple M3 Pro with 11 cores. Load averages (1, 5, 15 min):

| regime | before | after |
| --- | --- | --- |
| native | 4.12 4.33 4.79 | 4.66 6.41 5.93 |
| 4× throttle | 4.66 6.41 5.93 | 6.83 5.93 5.74 |

The 4× run started as the native run ended, so the two share that reading.

**Drift.** Median mount time, against the quieter 2026-11-03 runs (`run-1x.md`, `run-4x.md`), for the six arms that draw the same charts in both runs, with identical DOM node counts. Their timed pages did change: all of them go through a reworked `ArmPage.tsx`, five (all but visx) gained `EFFECTS` flags that are false on these pages, and TanStack renders through `shared/Chart.tsx`, which also loads `motion`. That code runs after `bench:start`, and machine load changed as well. So the table shows how far medians moved between the two dates, and it can't show how much of that came from code and how much from load:

| cells | native | 4× throttle |
| --- | ---: | ---: |
| heavy | 0.98–1.50× | 0.93–1.16× |
| typical | 0.85–1.57× | 0.81–1.50× |

These ranges are not a noise measurement. Read a heavy-chart gap under 20%, or any gap under one frame, as a tie, and do not rank the typical columns. The 20% is an editorial heuristic, not a measured bound. Two heavy cells moved past it, both ECharts at native speed and both by less than one frame: survival 32.5 → 48.8 ms (1.50×) and scatter 70.3 → 85.6 ms (1.22×). Every other heavy cell stayed within 1.16×. The table leaves out `none`, which was rewritten between the two dates: heavy scatter went 92.5 → 103.6 ms at 4× (1.12×, inside the heavy range above) and 29.6 → 23.7 ms at native speed. Neither move has a clean reading, for the same reason: code and load both changed. `none` also runs second in the order used here, after `shell`, so its 4× cells ran nearest the 4.66 load reading, while the six arms above ran later as load rose to 6.83. These runs can't settle whether the rewrite changed its speed.

These runs include a `shell` row: the default arm list omits it, so it was passed through `BENCH_ARMS`. The empty page measured 21.7–26.0 ms at native speed and 21.1–24.8 ms at 4×.

## Native speed

### mountMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 22.1 ±3.4 | 22.8 ±2.8 | 21.7 ±6.0 | 26.0 ±5.6 |
| none | 23.9 ±2.6 | 22.6 ±2.1 | 21.7 ±2.3 | 23.7 ±0.5 |
| nivo | 23.4 ±3.5 | 38.7 ±2.7 | 36.6 ±2.5 | 3236.5 ±92.5 |
| recharts | 28.8 ±1.5 | 119.8 ±6.6 | 31.8 ±2.9 | 309.6 ±13.1 |
| echarts | 20.1 ±4.8 | 48.8 ±9.8 | 24.2 ±3.3 | 85.6 ±2.9 |
| visx | 25.4 ±2.1 | 22.5 ±1.4 | 23.1 ±1.8 | 32.6 ±0.8 |
| tanstack | 19.3 ±2.1 | 24.5 ±0.9 | 21.9 ±2.8 | 53.3 ±4.9 |
| chartjs | 22.3 ±1.1 | 24.0 ±5.4 | 21.9 ±1.7 | 80.2 ±3.3 |

### naiveMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 0.3 ±0.1 | 0.2 ±0.1 | 0.3 ±0.1 | 0.3 ±0.1 |
| none | 1.5 ±0.4 | 4.8 ±1.2 | 2.1 ±0.3 | 13.7 ±0.2 |
| nivo | 10.4 ±0.7 | 33.0 ±0.8 | 21.3 ±0.7 | 279.0 ±12.4 |
| recharts | 1.4 ±0.2 | 3.4 ±0.1 | 1.1 ±0.1 | 1.0 ±0.1 |
| echarts | 12.8 ±1.4 | 43.6 ±8.9 | 12.5 ±3.9 | 82.9 ±2.9 |
| visx | 3.9 ±0.2 | 8.9 ±0.8 | 4.1 ±0.8 | 21.3 ±0.3 |
| tanstack | 4.6 ±0.4 | 22.6 ±0.6 | 4.6 ±0.5 | 39.9 ±2.8 |
| chartjs | 5.8 ±0.7 | 10.1 ±1.3 | 10.8 ±1.4 | 71.6 ±3.0 |

### maxFrameMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| none | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| nivo | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| recharts | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 33.4 ±8.3 |
| echarts | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| visx | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| tanstack | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| chartjs | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±8.2 |

### domNodes (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 2 | 2 | 2 | 2 |
| none | 118 | 553 | 565 | 10075 |
| nivo | 504 | 2552 | 584 | 10094 |
| recharts | 161 | 610 | 1609 | 30109 |
| echarts | 5 | 5 | 5 | 5 |
| visx | 154 | 593 | 601 | 10117 |
| tanstack | 107 | 540 | 563 | 10055 |
| chartjs | 2 | 2 | 2 | 2 |

## 4× CPU throttle

### mountMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 24.8 ±2.6 | 21.4 ±1.9 | 23.8 ±2.6 | 21.1 ±4.4 |
| none | 21.3 ±6.1 | 27.2 ±5.8 | 23.2 ±2.6 | 103.6 ±2.3 |
| nivo | 62.7 ±7.7 | 149.7 ±1.7 | 134.8 ±1.4 | 14899.8 ±2345.0 |
| recharts | 103.1 ±1.9 | 446.1 ±15.3 | 111.7 ±3.2 | 1195.8 ±21.7 |
| echarts | 49.2 ±0.8 | 123.7 ±3.4 | 48.0 ±1.4 | 260.9 ±6.6 |
| visx | 22.2 ±1.9 | 51.7 ±9.5 | 21.3 ±4.2 | 127.9 ±2.8 |
| tanstack | 20.9 ±4.4 | 90.6 ±3.6 | 20.1 ±2.8 | 195.9 ±2.3 |
| chartjs | 32.7 ±3.5 | 60.2 ±2.0 | 36.8 ±1.1 | 318.1 ±4.0 |

### naiveMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 0.8 ±0.1 | 0.8 ±0.1 | 0.8 ±0.1 | 0.9 ±0.2 |
| none | 4.7 ±0.6 | 16.7 ±2.3 | 7.4 ±0.7 | 58.0 ±1.4 |
| nivo | 36.5 ±1.3 | 127.3 ±1.7 | 74.9 ±1.1 | 1014.6 ±34.9 |
| recharts | 4.9 ±0.2 | 12.8 ±0.3 | 3.5 ±0.1 | 3.8 ±0.1 |
| echarts | 43.9 ±0.6 | 111.7 ±2.9 | 42.6 ±1.4 | 251.4 ±6.3 |
| visx | 12.1 ±0.6 | 34.3 ±0.5 | 14.5 ±0.8 | 80.6 ±3.1 |
| tanstack | 16.6 ±1.0 | 84.6 ±3.9 | 14.5 ±0.5 | 141.9 ±1.9 |
| chartjs | 20.7 ±0.4 | 37.5 ±1.8 | 32.3 ±0.9 | 282.8 ±3.1 |

### maxFrameMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 16.8 ±8.2 | 16.8 ±0.0 | 16.8 ±8.3 | 16.8 ±8.2 |
| none | 16.8 ±8.2 | 16.8 ±0.0 | 16.8 ±8.3 | 33.4 ±0.0 |
| nivo | 16.8 ±0.0 | 33.4 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| recharts | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 133.3 ±8.3 |
| echarts | 16.8 ±0.0 | 33.4 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| visx | 16.8 ±8.3 | 33.4 ±0.0 | 16.8 ±0.0 | 50.0 ±8.3 |
| tanstack | 16.8 ±0.0 | 16.8 ±0.0 | 33.2 ±8.2 | 33.4 ±0.0 |
| chartjs | 16.8 ±0.0 | 33.4 ±0.0 | 16.8 ±0.0 | 50.1 ±0.0 |

### domNodes (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 2 | 2 | 2 | 2 |
| none | 118 | 553 | 565 | 10075 |
| nivo | 504 | 2552 | 584 | 10094 |
| recharts | 161 | 610 | 1609 | 30109 |
| echarts | 5 | 5 | 5 | 5 |
| visx | 154 | 593 | 601 | 10117 |
| tanstack | 107 | 540 | 563 | 10055 |
| chartjs | 2 | 2 | 2 | 2 |

### Bundle (gzip, KB)

| library | total | library cost |
|---|---:|---:|
| chartjs | 124.5 | 55.6 |
| echarts | 233.1 | 164.2 |
| nivo | 172.1 | 103.1 |
| none | 71.1 | 2.2 |
| recharts | 175.1 | 106.2 |
| shell | 68.9 | 0 |
| tanstack | 125.7 | 56.8 |
| visx | 93.9 | 25 |
