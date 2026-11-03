import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import type { DataMessage, ResultMessage } from '../EmbeddedArmPage';
import { ARMS } from '../data/arms';
import { DATASETS, generateScatter, generateSurvival } from '../data/generate';
import type { ChartKind, DatasetSize } from '../data/generate';
import { measureAll } from './lab';
import type { LibraryResult, Measurements, Summary } from './lab';
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
type Library = keyof typeof LIBRARIES | 'calibrate';
const LABELS: Record<Library, string> = { ...LIBRARIES, calibrate: 'Known-cost test page' };

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
  const runId = useRef(0);
  const [status, setStatus] = useState<Status>({ state: 'loading' });

  useEffect(() => {
    const onMessage = (event: MessageEvent<ResultMessage>) => {
      if (event.origin !== location.origin || event.source !== ref.current?.contentWindow) return;
      const msg = event.data;
      if (msg.type === 'bench:ready') setReady(true);
      else if (msg.type === 'bench:result' && msg.mode === 'mount' && msg.runId === runId.current)
        setStatus({ state: 'done', ms: msg.mountMs });
      else if (msg.type === 'bench:error') setStatus({ state: 'error', message: msg.message });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    setStatus({ state: 'loading' });
    ref.current?.contentWindow?.postMessage(
      {
        type: 'bench:data',
        runId: ++runId.current,
        mode: 'mount',
        updateSettle: 'raf',
        ...data,
      } satisfies DataMessage,
      location.origin,
    );
  }, [ready, data]);

  return (
    <section className="card">
      <header>
        <h2>{LABELS[library]}</h2>
        <small className={status.state === 'error' ? 'error' : undefined}>
          {status.state === 'loading' && 'rendering…'}
          {status.state === 'done' && `${status.ms.toFixed(0)} ms to paint`}
          {status.state === 'error' && status.message}
        </small>
      </header>
      <div className="frame">
        <iframe ref={ref} src={`${library}.html`} title={LABELS[library]} />
      </div>
    </section>
  );
}

const fmt = ({ median, iqr }: Summary) => `${median.toFixed(1)} ± ${(iqr / 2).toFixed(1)} ms`;

function Summaries({ rows }: { rows: [string, LibraryResult][] }) {
  return (
    <ul className="summaries" data-summaries>
      {rows.map(([lib, r]) => (
        <li
          key={lib}
          data-lib={lib}
          data-samples={r.mount.n}
          data-mount={r.mount.median}
          data-update={r.update.median}
          data-blocking={r.blocking?.median ?? ''}
          data-dom-nodes={r.domNodes}
        >
          {lib}: mount {fmt(r.mount)}, update {fmt(r.update)}, blocking {r.blocking ? fmt(r.blocking) : 'n/a'}
          , {r.domNodes} nodes
        </li>
      ))}
    </ul>
  );
}

type Job = { libraries: Library[]; data: Parsed };

function Lab({
  job,
  query,
  onDone,
  onFail,
  onCancel,
}: {
  job: Job;
  query: URLSearchParams;
  onDone: (m: Measurements) => void;
  onFail: (message: string) => void;
  onCancel: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [progress, setProgress] = useState('starting…');

  useEffect(() => {
    const abort = new AbortController();
    measureAll(frame.current!, job.libraries, job.data, {
      query,
      signal: abort.signal,
      onProgress: (done, total, library) => setProgress(`measuring ${library} (${done + 1} of ${total})`),
    }).then(
      m => !abort.signal.aborted && onDone(m),
      e => {
        if (!abort.signal.aborted) onFail(e instanceof Error ? e.message : String(e));
      },
    );
    return () => abort.abort();
  }, []);

  return (
    <div className="lab" data-lab>
      <div className="lab-bar">
        <span>{progress}</span>
        <button onClick={onCancel}>Cancel</button>
      </div>
      <iframe ref={frame} title="measurement" />
    </div>
  );
}

const params = new URLSearchParams(location.search);
const requested = (params.get('libs') ?? '').split(',').filter((l): l is Library => l in LABELS);
params.delete('libs');

function Playground() {
  const [job, setJob] = useState<Job | null>(null);
  const [measured, setMeasured] = useState<Measurements | null>(null);
  const [shown, setShown] = useState<Library[]>([]);
  const [runError, setRunError] = useState('');
  const [chart, setChart] = useState<ChartKind>('survival');
  const [libraries, setLibraries] = useState<Library[]>(
    requested.length ? requested : ['recharts', 'echarts'],
  );
  const [text, setText] = useState(() => sample('survival', 'typical'));
  const [data, setData] = useState<Parsed>(() => parseSeries('survival', text));
  const [error, setError] = useState('');

  const apply = (nextChart: ChartKind, nextText: string) => {
    try {
      const parsed = parseSeries(nextChart, nextText);
      setData(parsed);
      setError('');
      return parsed;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const measure = () => {
    const parsed = apply(chart, text);
    if (!parsed || libraries.length === 0) return;
    setRunError('');
    setMeasured(null);
    setShown([]);
    setJob({
      libraries: (Object.keys(LABELS) as Library[]).filter(l => libraries.includes(l)),
      data: parsed,
    });
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

        <fieldset disabled={!!job}>
          <legend>Libraries</legend>
          {(Object.keys(LIBRARIES) as Library[]).map(lib => (
            <label key={lib}>
              <input type="checkbox" checked={libraries.includes(lib)} onChange={() => toggle(lib)} />
              {lib}
            </label>
          ))}
        </fieldset>

        <fieldset disabled={!!job}>
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

        <fieldset disabled={!!job}>
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
            <button className="primary" onClick={measure} disabled={!!job}>
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
        {runError && (
          <p className="error" role="alert">
            {runError}
          </p>
        )}
        {measured && (
          <Summaries rows={[['shell (floor)', measured.floor], ...Object.entries(measured.results)]} />
        )}
        {shown.map(lib => (
          <ArmFrame key={lib} library={lib} data={data} />
        ))}
      </div>
      {job && (
        <Lab
          job={job}
          query={params}
          onDone={m => {
            setMeasured(m);
            setShown(job.libraries);
            setJob(null);
          }}
          onFail={message => {
            setRunError(message);
            setJob(null);
          }}
          onCancel={() => setJob(null)}
        />
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Playground />);
