import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { DataMessage, ResultMessage } from '../ArmPage';
import { ARMS } from '../data/arms';
import { DATASETS, generateScatter, generateSurvival } from '../data/generate';
import type { ChartKind, DatasetSize } from '../data/generate';
import { formatSeries, parseSeries } from './parse';
import type { Parsed } from './parse';

const LIBRARIES: Record<Exclude<(typeof ARMS)[number], 'shell'>, string> = {
  none: 'No library (React + d3-scale SVG)',
  nivo: 'nivo (SVG)',
  recharts: 'Recharts (SVG)',
  echarts: 'Apache ECharts (Canvas)',
  visx: 'visx (SVG)',
  tanstack: 'TanStack Charts',
  chartjs: 'Chart.js (Canvas)',
};
type Library = keyof typeof LIBRARIES;

const sample = (chart: ChartKind, size: DatasetSize) =>
  formatSeries(
    chart === 'survival'
      ? generateSurvival(DATASETS.survival[size])
      : generateScatter(DATASETS.scatter[size]),
  );

type Status = { state: 'loading' } | { state: 'done'; ms: number } | { state: 'error'; message: string };

function ArmFrame({ library, data }: { library: Library; data: Parsed }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<Status>({ state: 'loading' });

  useEffect(() => {
    const onMessage = (event: MessageEvent<ResultMessage>) => {
      if (event.origin !== location.origin || event.source !== ref.current?.contentWindow) return;
      const msg = event.data;
      if (msg.type === 'bench:ready') setReady(true);
      else if (msg.type === 'bench:settled') setStatus({ state: 'done', ms: msg.ms });
      else if (msg.type === 'bench:error') setStatus({ state: 'error', message: msg.message });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setStatus({ state: 'loading' });
    ref.current?.contentWindow?.postMessage(
      { type: 'bench:data', ...data } satisfies DataMessage,
      location.origin,
    );
  }, [ready, data]);

  return (
    <section className="card">
      <header>
        <h2>{LIBRARIES[library]}</h2>
        <small className={status.state === 'error' ? 'error' : undefined}>
          {status.state === 'loading' && 'rendering…'}
          {status.state === 'done' && `${status.ms.toFixed(0)} ms to paint`}
          {status.state === 'error' && status.message}
        </small>
      </header>
      <div className="frame">
        <iframe ref={ref} src={`${library}.html`} title={LIBRARIES[library]} />
      </div>
    </section>
  );
}

function Playground() {
  const [chart, setChart] = useState<ChartKind>('survival');
  const [libraries, setLibraries] = useState<Library[]>(['recharts', 'echarts']);
  const [text, setText] = useState(() => sample('survival', 'typical'));
  const [data, setData] = useState<Parsed>(() => parseSeries('survival', text));
  const [error, setError] = useState('');

  const apply = (nextChart: ChartKind, nextText: string) => {
    try {
      setData(parseSeries(nextChart, nextText));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const load = (nextChart: ChartKind, size: DatasetSize) => {
    const next = sample(nextChart, size);
    setChart(nextChart);
    setText(next);
    apply(nextChart, next);
  };
  const toggle = (lib: Library) =>
    setLibraries(cur => (cur.includes(lib) ? cur.filter(l => l !== lib) : [...cur, lib]));

  return (
    <main>
      <div>
        <h1>chart-bench playground</h1>
        <p>
          Pick libraries, paste your data, compare. Every library renders the same chart from the same JSON.
        </p>

        <fieldset>
          <legend>Libraries</legend>
          {(Object.keys(LIBRARIES) as Library[]).map(lib => (
            <label key={lib}>
              <input type="checkbox" checked={libraries.includes(lib)} onChange={() => toggle(lib)} />
              {lib}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Chart</legend>
          {(['survival', 'scatter'] as const).map(kind => (
            <label key={kind}>
              <input
                type="radio"
                name="chart"
                checked={chart === kind}
                onChange={() => load(kind, 'typical')}
              />
              {kind === 'survival' ? 'Survival curve' : 'Scatter'}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Data (JSON)</legend>
          <small>
            {chart === 'survival'
              ? 'Array of { id, color?, points: [{ x, y, lower?, upper?, censored? }] }. y in 0..1.'
              : 'Array of { id, color?, points: [{ x, y, size? }] }.'}
          </small>
          <div className="row">
            <button onClick={() => load(chart, 'typical')}>Sample: typical</button>
            <button onClick={() => load(chart, 'heavy')}>Sample: heavy</button>
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            spellCheck={false}
            aria-label="Chart data as JSON"
          />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button className="primary" onClick={() => apply(chart, text)}>
              Render
            </button>
          </div>
        </fieldset>
        <small>
          Times are a single run, mount → painted, with libraries rendering side by side — indicative only.
          See the README for the controlled benchmark.
        </small>
      </div>

      <div className="charts">
        {libraries.length === 0 && <p>Select at least one library.</p>}
        {(Object.keys(LIBRARIES) as Library[])
          .filter(lib => libraries.includes(lib))
          .map(lib => (
            <ArmFrame key={lib} library={lib} data={data} />
          ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Playground />);
