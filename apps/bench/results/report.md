# Published results, 2026-11-06

Reconciled by hand from `loaded-20261106-1x.md` and `loaded-20261106-4x.md`.

**Conditions: not a quiet machine.** Both regimes ran on 2026-11-06 with other work running, on an Apple M3 Pro with 11 cores. Load averages (1, 5, 15 min):

| regime | before | after |
| --- | --- | --- |
| native | 4.35 6.68 6.63 | 5.45 5.63 6.12 |
| 4× throttle | 6.48 5.86 6.19 | 3.66 5.08 5.83 |

`pnpm report` and the drift script also overlapped the start of the 4× run. The logs have no per-test timestamps, so the number of cells touched is unknown.

**Drift.** Median mount time, against the quieter 2026-11-03 runs (`run-1x.md`, `run-4x.md`), for the six arms whose timed code did not change:

| cells | native | 4× throttle |
| --- | ---: | ---: |
| heavy | 0.91–1.17× | 1.00–1.13× |
| typical | 0.98–1.81× | 0.78–1.51× |

Read a heavy-chart gap under 20%, or any gap under one frame, as a tie, and do not rank the typical columns. `none` was rewritten between the two dates, so the same-code limits don't cover it: heavy scatter went 92.5 → 120.3 ms at 4× (1.30×, past every same-code heavy cell) and 29.6 → 25.6 ms at native speed. That move is unexplained. `none` runs first in the fixed order in `bench.spec.ts`, so its 4× cells ran nearest the 6.48 load reading and the script overlap, while the same-code arms ran later as load fell to 3.66. These runs can't settle whether the rewrite slowed it.

These runs have no `shell` row: the default arm list omits it, so the empty-page baseline was not re-measured. The last figures are in `run-1x.md` and `run-4x.md`.

## Native speed

### mountMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| none | 23.7 ±5.2 | 22.3 ±1.3 | 22.9 ±3.0 | 25.6 ±3.3 |
| nivo | 27.0 ±4.3 | 41.6 ±13.9 | 42.3 ±4.4 | 3240.3 ±74.3 |
| recharts | 25.1 ±3.3 | 123.9 ±2.1 | 29.4 ±2.4 | 294.8 ±5.9 |
| echarts | 22.2 ±4.1 | 34.0 ±5.4 | 22.8 ±2.7 | 68.6 ±3.7 |
| visx | 23.9 ±3.9 | 20.1 ±2.0 | 23.4 ±3.9 | 31.6 ±1.3 |
| tanstack | 22.1 ±1.7 | 24.9 ±1.2 | 22.3 ±6.3 | 48.5 ±2.8 |
| chartjs | 22.4 ±0.9 | 22.3 ±1.0 | 22.8 ±1.6 | 77.9 ±2.1 |

### naiveMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| none | 1.4 ±0.2 | 4.7 ±0.4 | 2.5 ±0.4 | 14.5 ±2.0 |
| nivo | 10.3 ±1.1 | 34.7 ±2.6 | 22.1 ±1.7 | 281.8 ±17.8 |
| recharts | 1.2 ±0.2 | 3.4 ±0.3 | 1.0 ±0.1 | 0.9 ±0.1 |
| echarts | 11.6 ±0.9 | 30.8 ±2.1 | 11.8 ±0.9 | 66.5 ±3.4 |
| visx | 4.2 ±0.6 | 8.2 ±0.8 | 5.2 ±1.2 | 20.7 ±1.1 |
| tanstack | 4.9 ±0.3 | 23.5 ±0.9 | 4.3 ±0.4 | 36.0 ±2.9 |
| chartjs | 5.2 ±0.5 | 10.9 ±1.2 | 8.5 ±0.7 | 69.3 ±2.2 |

### maxFrameMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| none | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| nivo | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| recharts | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 33.4 ±8.3 |
| echarts | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| visx | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| tanstack | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| chartjs | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |

### domNodes (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
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
| none | 24.4 ±6.0 | 30.0 ±14.6 | 22.8 ±1.9 | 120.3 ±6.8 |
| nivo | 60.9 ±4.9 | 144.4 ±7.8 | 170.4 ±20.6 | 14201.7 ±1043.4 |
| recharts | 97.4 ±1.6 | 435.4 ±31.1 | 112.1 ±4.9 | 1162.0 ±15.4 |
| echarts | 47.7 ±0.9 | 117.2 ±1.8 | 47.8 ±2.1 | 259.6 ±7.1 |
| visx | 20.0 ±1.9 | 55.9 ±4.7 | 23.2 ±4.2 | 130.1 ±5.6 |
| tanstack | 24.0 ±4.9 | 89.7 ±4.4 | 24.8 ±3.3 | 189.2 ±6.9 |
| chartjs | 35.1 ±5.0 | 58.5 ±0.6 | 36.4 ±1.5 | 305.3 ±5.3 |

### naiveMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| none | 5.1 ±0.6 | 21.2 ±3.0 | 7.7 ±0.8 | 65.2 ±3.9 |
| nivo | 35.2 ±3.4 | 122.8 ±6.4 | 96.9 ±12.2 | 992.2 ±21.0 |
| recharts | 4.8 ±0.2 | 12.2 ±0.8 | 3.4 ±0.1 | 3.8 ±0.4 |
| echarts | 42.0 ±0.8 | 105.1 ±1.4 | 42.2 ±1.9 | 249.8 ±7.5 |
| visx | 11.8 ±0.9 | 32.6 ±1.3 | 13.9 ±0.5 | 80.5 ±3.4 |
| tanstack | 16.8 ±0.9 | 83.5 ±4.3 | 14.1 ±0.9 | 136.4 ±4.7 |
| chartjs | 20.7 ±0.7 | 36.3 ±0.8 | 31.9 ±0.5 | 270.4 ±5.3 |

### maxFrameMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| none | 16.8 ±0.0 | 16.8 ±8.3 | 16.8 ±8.3 | 33.4 ±8.3 |
| nivo | 16.8 ±0.0 | 33.4 ±8.3 | 16.8 ±0.0 | 16.8 ±0.0 |
| recharts | 16.8 ±8.2 | 16.8 ±8.3 | 16.8 ±8.2 | 116.8 ±8.3 |
| echarts | 16.8 ±0.0 | 33.4 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| visx | 16.8 ±0.0 | 33.4 ±0.1 | 16.8 ±0.0 | 50.0 ±0.0 |
| tanstack | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 33.4 ±0.0 |
| chartjs | 16.8 ±0.0 | 33.4 ±0.0 | 33.3 ±8.3 | 50.1 ±0.0 |

### domNodes (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
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
