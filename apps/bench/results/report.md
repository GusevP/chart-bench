
### mountMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 27.2 ±0.5 | 25.9 ±1.4 | 26.7 ±0.9 | 27.1 ±1.1 |
| none | 25.3 ±1.0 | 32.5 ±13.1 | 26.6 ±1.0 | 95.2 ±2.1 |
| nivo | 56.1 ±1.1 | 142.4 ±2.6 | 125.6 ±3.2 | 12911.7 ±387.1 |
| recharts | 92.4 ±2.4 | 420.3 ±9.3 | 99.1 ±2.2 | 1116.3 ±15.6 |
| echarts | 44.8 ±1.0 | 115.0 ±2.7 | 44.6 ±0.8 | 241.3 ±8.9 |
| visx | 28.2 ±3.8 | 54.7 ±9.1 | 24.9 ±3.1 | 117.3 ±2.1 |
| tanstack | 23.3 ±2.6 | 81.3 ±4.4 | 27.4 ±0.9 | 174.6 ±5.1 |
| chartjs | 28.3 ±5.4 | 56.4 ±1.8 | 35.0 ±0.8 | 301.9 ±4.0 |

### maxFrameMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| none | 16.8 ±0.0 | 16.8 ±8.2 | 16.8 ±8.2 | 33.3 ±0.0 |
| nivo | 16.8 ±0.0 | 33.4 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| recharts | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 116.7 ±0.0 |
| echarts | 16.8 ±0.0 | 33.4 ±0.0 | 16.8 ±0.0 | 16.8 ±8.3 |
| visx | 16.8 ±0.0 | 33.3 ±8.3 | 16.8 ±0.0 | 33.5 ±8.3 |
| tanstack | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±8.2 | 33.4 ±0.1 |
| chartjs | 16.8 ±0.0 | 33.4 ±0.0 | 16.8 ±0.0 | 50.1 ±0.1 |

### domNodes (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 2 | 2 | 2 | 2 |
| none | 116 | 551 | 563 | 10073 |
| nivo | 504 | 2552 | 584 | 10094 |
| recharts | 161 | 610 | 1609 | 30109 |
| echarts | 5 | 5 | 5 | 5 |
| visx | 154 | 593 | 601 | 10117 |
| tanstack | 107 | 540 | 563 | 10055 |
| chartjs | 2 | 2 | 2 | 2 |

### Bundle (gzip, KB)

| library | total | library cost |
|---|---:|---:|
| chartjs | 124.3 | 55.4 |
| echarts | 232.8 | 164 |
| nivo | 172 | 103.2 |
| none | 80.4 | 11.5 |
| recharts | 175 | 106.1 |
| shell | 68.9 | 0 |
| tanstack | 111 | 42.1 |
| visx | 94 | 25.1 |
