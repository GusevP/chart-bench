
### mountMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 26.1 ±0.7 | 25.3 ±1.2 | 26.8 ±0.9 | 24.0 ±1.6 |
| none | 25.3 ±1.0 | 37.6 ±10.7 | 26.6 ±1.0 | 92.5 ±5.6 |
| nivo | 41.7 ±2.1 | 139.4 ±3.8 | 123.5 ±2.9 | 12880.6 ±439.2 |
| recharts | 94.3 ±2.0 | 412.4 ±8.1 | 101.9 ±2.0 | 1110.0 ±13.9 |
| echarts | 45.7 ±1.0 | 115.2 ±1.4 | 43.4 ±0.8 | 240.7 ±5.6 |
| visx | 25.7 ±1.7 | 55.7 ±9.9 | 26.1 ±1.5 | 115.4 ±3.3 |
| tanstack | 25.8 ±2.3 | 83.7 ±4.7 | 24.0 ±4.9 | 180.0 ±5.1 |
| chartjs | 23.3 ±3.1 | 56.4 ±2.7 | 34.0 ±1.2 | 294.1 ±8.9 |

### naiveMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 0.6 ±0.0 | 0.5 ±0.3 | 0.8 ±0.1 | 0.7 ±0.1 |
| none | 5.6 ±0.3 | 23.1 ±0.5 | 6.5 ±0.4 | 52.1 ±2.0 |
| nivo | 33.5 ±0.6 | 117.3 ±2.1 | 69.8 ±2.1 | 936.9 ±10.4 |
| recharts | 4.3 ±0.2 | 11.9 ±0.6 | 2.9 ±0.1 | 3.1 ±0.4 |
| echarts | 40.6 ±0.7 | 103.4 ±1.5 | 38.7 ±0.9 | 232.4 ±5.1 |
| visx | 11.3 ±0.3 | 31.6 ±0.6 | 12.7 ±0.4 | 72.0 ±0.9 |
| tanstack | 15.5 ±0.9 | 78.6 ±4.2 | 13.1 ±0.4 | 129.5 ±4.6 |
| chartjs | 19.0 ±0.7 | 35.0 ±1.2 | 30.2 ±0.9 | 259.7 ±8.5 |

### maxFrameMs (median ±IQR/2, n per cell shown in raw data)

| library | survival-typical | survival-heavy | scatter-typical | scatter-heavy |
|---|---:|---:|---:|---:|
| shell | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| none | 16.8 ±0.0 | 16.8 ±8.2 | 16.8 ±8.3 | 33.3 ±0.0 |
| nivo | 16.8 ±0.0 | 33.4 ±0.1 | 16.8 ±0.0 | 16.8 ±0.0 |
| recharts | 16.8 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 | 116.7 ±8.3 |
| echarts | 16.8 ±0.0 | 33.4 ±0.0 | 16.8 ±0.0 | 16.8 ±0.0 |
| visx | 16.8 ±8.2 | 33.2 ±8.2 | 16.8 ±0.0 | 50.0 ±8.3 |
| tanstack | 16.8 ±0.0 | 16.8 ±8.3 | 16.8 ±0.0 | 33.3 ±8.3 |
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
| chartjs | 123.4 | 55.5 |
| echarts | 231.9 | 164 |
| nivo | 171.1 | 103.2 |
| none | 79.5 | 11.5 |
| recharts | 174.1 | 106.1 |
| shell | 67.9 | 0 |
| tanstack | 110.1 | 42.1 |
| visx | 93.1 | 25.1 |
