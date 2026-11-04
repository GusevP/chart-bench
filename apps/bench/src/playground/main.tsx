import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import bundle from '../../results/bundle.json';
import galleryBundle from '../../results/gallery-bundle.json';
import type { DataMessage, ResultMessage } from '../EmbeddedArmPage';
import { ARMS } from '../data/arms';
import type { ChartKind } from '../data/contract';
import type { DatasetSize } from '../data/generate';
import { framePeriod } from './frame';
import { RUNS, WARMUP, frameSrc, measureAll } from './lab';
import type { LibraryResult, Measurements, Summary } from './lab';
import { isGallery, kindInfo, kinds, parseSeries, sample } from './parse';
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

const fmt = ({ median, iqr }: Summary) => `${median.toFixed(1)} ± ${(iqr / 2).toFixed(1)}`;
const bundleKb: Record<string, { libraryKb: number } | undefined> = bundle;
const galleryKb: Record<string, Record<string, { libraryKb: number } | undefined> | undefined> =
  galleryBundle;

const libraryKb = (library: string, chart: ChartKind) =>
  isGallery(chart) ? galleryKb[library]?.[chart]?.libraryKb : bundleKb[library]?.libraryKb;
const supported = (library: Library, chart: ChartKind) =>
  isGallery(chart) ? libraryKb(library, chart) !== undefined : true;

function ArmFrame({
  library,
  data,
  result,
  hover,
  onHover,
}: {
  library: Library;
  data: Parsed;
  result?: LibraryResult;
  hover?: number;
  onHover: (library: Library, maxFrameMs: number) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const runId = useRef(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const onMessage = (event: MessageEvent<ResultMessage>) => {
      if (event.origin !== location.origin || event.source !== ref.current?.contentWindow) return;
      const msg = event.data;
      if (msg.type === 'bench:ready') setReady(true);
      else if (msg.type === 'bench:hover') onHover(library, msg.maxFrameMs);
      else if (msg.type === 'bench:error') setError(msg.message);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
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

  const src = new URLSearchParams(params);
  src.set('embed', 'display');

  if (!supported(library, data.chart))
    return (
      <section className="card unsupported" data-unsupported={library}>
        <header>
          <h2>{LABELS[library]}</h2>
          <small>Not supported: no {kindInfo(data.chart).label.toLowerCase()} for this library.</small>
        </header>
      </section>
    );

  return (
    <section className="card">
      <header>
        <h2>{LABELS[library]}</h2>
        {result && (
          <small data-card-stats>
            mount {fmt(result.mount)} ms · update {fmt(result.update)} ms · blocking{' '}
            {result.blocking ? `${fmt(result.blocking)} ms` : 'n/a'} · {result.domNodes} nodes ·{' '}
            {libraryKb(library, data.chart)?.toFixed(1) ?? 'n/a'} KB
            {hover !== undefined && ` · hover ${hover.toFixed(1)} ms`}
          </small>
        )}
        {error && <small className="error">{error}</small>}
      </header>
      <div className="frame">
        <iframe ref={ref} src={frameSrc(library, data.chart, src)} title={LABELS[library]} />
      </div>
    </section>
  );
}

function Cell({ s, floor, frame }: { s: Summary | null; floor?: Summary; frame: number }) {
  if (!s) return <td>n/a</td>;
  const noise = floor !== undefined && s.median <= floor.median + 2 * frame;
  return (
    <td
      className={noise ? 'noise' : undefined}
      title={noise ? 'within 2 frames of the shell floor' : undefined}
    >
      {fmt(s)}
    </td>
  );
}

function Summaries({
  measured,
  chart,
  frame,
  hover,
}: {
  measured: Measurements;
  chart: ChartKind;
  frame: number;
  hover: Record<string, number>;
}) {
  const rows: [string, LibraryResult, boolean][] = [
    ['shell (floor)', measured.floor, true],
    ...Object.entries(measured.results).map(([lib, r]): [string, LibraryResult, boolean] => [lib, r, false]),
  ];
  return (
    <div className="table-scroll">
      <table className="summaries" data-summaries>
        <caption>
          Median ± half the IQR, {RUNS} runs after {WARMUP} warm-up.
        </caption>
        <thead>
          <tr>
            <th scope="col">Library</th>
            <th scope="col">Mount (ms)</th>
            <th scope="col">Update (ms)</th>
            <th scope="col">Blocking (ms)</th>
            <th scope="col">DOM nodes</th>
            <th scope="col">Bundle (KB gz)</th>
            <th scope="col">Hover max frame (ms)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([lib, r, isFloor]) => {
            const kb = isFloor ? bundleKb.shell?.libraryKb : libraryKb(lib, chart);
            return (
              <tr
                key={lib}
                data-lib={lib}
                data-samples={r.mount.n}
                data-mount={r.mount.median}
                data-update={r.update.median}
                data-blocking={r.blocking?.median ?? ''}
                data-dom-nodes={r.domNodes}
                data-bundle-kb={kb ?? ''}
              >
                <th scope="row">{lib}</th>
                <Cell s={r.mount} floor={isFloor ? undefined : measured.floor.mount} frame={frame} />
                <Cell s={r.update} floor={isFloor ? undefined : measured.floor.update} frame={frame} />
                <Cell s={r.blocking} frame={frame} />
                <td>{r.domNodes}</td>
                <td>{kb?.toFixed(1) ?? 'n/a'}</td>
                <td data-hover={hover[lib] ?? ''}>
                  {isFloor ? '' : hover[lib] === undefined ? 'hover a chart' : hover[lib].toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Job = { libraries: Library[]; unsupported: Library[]; data: Parsed };

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
  const card = useRef<HTMLElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [library, setLibrary] = useState<{ name: string; index: number; total: number } | null>(null);
  const [run, setRun] = useState<{ n: number; total: number } | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    card.current!.scrollIntoView({ block: 'nearest' });
    measureAll(frame.current!, job.libraries, job.data, {
      query,
      signal: abort.signal,
      onProgress: (done, total, name) => setLibrary({ name, index: done + 1, total }),
      onRun: (n, total) => setRun({ n, total }),
    }).then(
      m => !abort.signal.aborted && onDone(m),
      e => {
        if (!abort.signal.aborted) onFail(e instanceof Error ? e.message : String(e));
      },
    );
    return () => abort.abort();
  }, []);

  return (
    <section className="card lab" data-lab ref={card}>
      <div className="frame">
        <div className="lab-stage">
          <iframe ref={frame} title="measurement" />
          <div className="lab-panel">
            <div className="spinner" aria-hidden="true" />
            <h2>Measuring…</h2>
            {library && (
              <p>
                {library.name === 'shell' ? 'Empty page (baseline)' : LABELS[library.name as Library]}
                {' · '}library {library.index} of {library.total}
                {run &&
                  ` · ${run.n <= WARMUP ? 'warm-up' : `run ${run.n - WARMUP} of ${run.total - WARMUP}`}`}
              </p>
            )}
            <button onClick={onCancel}>Cancel</button>
          </div>
        </div>
      </div>
    </section>
  );
}

const params = new URLSearchParams(location.search);
const requested = (params.get('libs') ?? '').split(',').filter((l): l is Library => l in LABELS);
params.delete('libs');

function Playground() {
  const [job, setJob] = useState<Job | null>(null);
  const [measured, setMeasured] = useState<Measurements | null>(null);
  const [shown, setShown] = useState<Job | null>(null);
  const [hover, setHover] = useState<Record<string, number>>({});
  const [frame, setFrame] = useState(16.7);
  const [runError, setRunError] = useState('');
  const [chart, setChart] = useState<ChartKind>('survival');
  const [libraries, setLibraries] = useState<Library[]>(
    requested.length ? requested : ['recharts', 'echarts'],
  );
  const [text, setText] = useState(() => sample('survival', 'typical'));
  const [error, setError] = useState('');

  const apply = (nextChart: ChartKind, nextText: string) => {
    try {
      const parsed = parseSeries(nextChart, nextText);
      setError('');
      return parsed;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const measure = () => {
    const parsed = apply(chart, text);
    if (!parsed || libraries.length === 0) return;
    const selected = (Object.keys(LABELS) as Library[]).filter(l => libraries.includes(l));
    const measurable = selected.filter(l => supported(l, chart));
    setRunError('');
    setMeasured(null);
    setHover({});
    if (measurable.length === 0) {
      setShown({ libraries: [], unsupported: selected, data: parsed });
      return;
    }
    setShown(null);
    setJob({
      libraries: measurable,
      unsupported: selected.filter(l => !measurable.includes(l)),
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
          {kinds.map(kind => (
            <label key={kind}>
              <input
                type="radio"
                name="chart"
                checked={chart === kind}
                onChange={() => load(kind, 'typical')}
              />
              {kindInfo(kind).label}
            </label>
          ))}
        </fieldset>

        <fieldset disabled={!!job}>
          <legend>Data (JSON)</legend>
          <small>{kindInfo(chart).hint}</small>
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
          Each library is measured alone in a fresh page, one after another, and the charts are shown only
          afterwards. Numbers are comparable within this session only.
        </small>
      </div>

      <div className="charts">
        {job && (
          <Lab
            job={job}
            query={params}
            onDone={m => {
              setMeasured(m);
              setShown(job);
              setJob(null);
              void framePeriod().then(setFrame);
            }}
            onFail={message => {
              setRunError(message);
              setJob(null);
            }}
            onCancel={() => setJob(null)}
          />
        )}
        {libraries.length === 0 && <p>Select at least one library.</p>}
        {runError && (
          <p className="error" role="alert">
            {runError}
          </p>
        )}
        {measured && shown && (
          <Summaries measured={measured} chart={shown.data.chart} frame={frame} hover={hover} />
        )}
        {shown?.libraries.map(lib => (
          <ArmFrame
            key={lib}
            library={lib}
            data={shown.data}
            result={measured?.results[lib]}
            hover={hover[lib]}
            onHover={(l, ms) => setHover(cur => ({ ...cur, [l]: ms }))}
          />
        ))}
        {shown?.unsupported.map(lib => (
          <ArmFrame key={lib} library={lib} data={shown.data} onHover={() => {}} />
        ))}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Playground />);
