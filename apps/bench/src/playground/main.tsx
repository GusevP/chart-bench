import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import bundle from '../../results/bundle.json';
import codeTokens from '../../results/code-tokens.json';
import galleryBundle from '../../results/gallery-bundle.json';
import type { DataMessage, ResultMessage } from '../EmbeddedArmPage';
import { ARMS } from '../data/arms';
import type { ChartKind } from '../data/contract';
import type { DatasetSize } from '../data/generate';
import { framePeriod } from './frame';
import { RUNS, SLOW_MS, TIMEOUT_MS, WARMUP, frameSrc, measureAll } from './lab';
import type { LibraryResult, Measurements, Summary } from './lab';
import { hasSize, isGallery, kindInfo, kinds, parseSeries, sample } from './parse';
import type { Parsed } from './parse';
import { GLYPHS, Logo, META } from './meta';
import { rankBy } from './rank';
import type { Rank } from './rank';

const LIBRARIES = Object.fromEntries(
  Object.entries(META).map(([lib, m]) => [lib, `${m.name} (${m.renderer})`]),
) as Record<keyof typeof META, string>;
META satisfies Record<Exclude<(typeof ARMS)[number], 'shell'>, unknown>;
type Library = keyof typeof LIBRARIES | 'calibrate';
const LABELS: Record<Library, string> = { ...LIBRARIES, calibrate: 'Known-cost test page' };

const TIMED_OUT = `> ${TIMEOUT_MS / 1000} s`;
const fmt = ({ median, iqr, n }: Summary) =>
  !Number.isFinite(median)
    ? TIMED_OUT
    : n === 1
      ? median.toFixed(1)
      : `${median.toFixed(1)} ± ${(iqr / 2).toFixed(1)}`;
const bundleKb: Record<string, { libraryKb: number } | undefined> = bundle;
const galleryKb: Record<string, Record<string, { libraryKb: number } | undefined> | undefined> =
  galleryBundle;

const libraryKb = (library: string, chart: ChartKind) =>
  isGallery(chart) ? galleryKb[library]?.[chart]?.libraryKb : bundleKb[library]?.libraryKb;
const tokensByChart: Record<string, Record<string, { total: number } | undefined> | undefined> =
  codeTokens.perChart;
const tokenCount = (library: string, chart: ChartKind) =>
  tokensByChart[library]?.[isGallery(chart) ? chart : 'survival+scatter']?.total;
const supported = (library: Library, chart: ChartKind) =>
  isGallery(chart) ? libraryKb(library, chart) !== undefined : true;

function ArmFrame({
  library,
  data,
  effects,
  result,
  hover,
  onHover,
}: {
  library: Library;
  data: Parsed;
  effects?: boolean;
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
  if (effects) src.set('effects', '1');

  if (!supported(library, data.chart))
    return (
      <section className="card unsupported" data-unsupported={library}>
        <header>
          <CardTitle library={library} />
          <small>Not supported: no {kindInfo(data.chart).label.toLowerCase()} for this library.</small>
        </header>
      </section>
    );

  if (result?.timedOut)
    return (
      <section className="card unsupported" data-timed-out={library}>
        <header>
          <CardTitle library={library} />
          <small>
            {result.probeMs
              ? `Skipped: the heavy sample alone took ${(result.probeMs / 1000).toFixed(1)} s, so ~100k would likely run past ${TIMEOUT_MS / 1000} s.`
              : `Timed out: no run finished within ${TIMEOUT_MS / 1000} s, so the chart is not drawn again here.`}
          </small>
        </header>
      </section>
    );

  if (result && result.mount.median + result.update.median > SLOW_MS)
    return (
      <section className="card unsupported" data-slow={library}>
        <header>
          <CardTitle library={library} />
          <small>
            Not drawn again: one run took {((result.mount.median + result.update.median) / 1000).toFixed(1)}{' '}
            s, and redrawing it here would freeze the tab.
          </small>
        </header>
      </section>
    );

  return (
    <section className="card">
      <header>
        <CardTitle library={library} />
        {!result && <small data-card-preview>Preview, not measured. Press Render to measure.</small>}
        {result && (
          <small data-card-stats>
            mount {fmt(result.mount)} ms · update {fmt(result.update)} ms · blocking{' '}
            {result.blocking ? `${fmt(result.blocking)} ms` : 'n/a'} · {result.domNodes} nodes ·{' '}
            {libraryKb(library, data.chart)?.toFixed(1) ?? 'n/a'} KB ·{' '}
            {tokenCount(library, data.chart) ?? 'n/a'} tokens
            {!isGallery(data.chart) && ' (survival + scatter)'}
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

function CardTitle({ library }: { library: Library }) {
  if (library === 'calibrate') return <h2>{LABELS[library]}</h2>;
  const meta = META[library];
  return (
    <h2 className="card-title">
      <Logo meta={meta} />
      {meta.name}
      <span className="lib-sub">{meta.renderer}</span>
    </h2>
  );
}

const RANK_TITLES = { best: 'lowest in this column', worst: 'highest in this column' };

const cellProps = (rank?: Rank, noise = false) => ({
  className: [noise && 'noise', rank].filter(Boolean).join(' ') || undefined,
  title:
    [noise && 'within 2 frames of the shell floor', rank && RANK_TITLES[rank]].filter(Boolean).join('; ') ||
    undefined,
});

function Cell({
  s,
  floor,
  frame,
  rank,
  skipped,
}: {
  s: Summary | null;
  floor?: Summary;
  frame: number;
  rank?: Rank;
  skipped?: boolean;
}) {
  if (!s) return <td>n/a</td>;
  const noise = floor !== undefined && s.median <= floor.median + 2 * frame;
  return <td {...cellProps(rank, noise)}>{skipped ? 'skipped' : fmt(s)}</td>;
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
  const libs = Object.entries(measured.results);
  const rankOf = (value: (lib: string, r: LibraryResult) => number | undefined, margin = 0) =>
    rankBy(
      libs.map(([lib, r]) => value(lib, r)),
      margin,
    );
  const ranks = {
    mount: rankOf((_, r) => r.mount.median, 2 * frame),
    update: rankOf((_, r) => r.update.median, 2 * frame),
    blocking: rankOf((_, r) => r.blocking?.median, 2 * frame),
    domNodes: rankOf((_, r) => (r.timedOut ? undefined : r.domNodes)),
    kb: rankOf(lib => libraryKb(lib, chart)),
    tokens: rankOf(lib => tokenCount(lib, chart)),
    hover: rankOf(lib => hover[lib], 2 * frame),
  };
  return (
    <div className="table-scroll">
      <table className="summaries" data-summaries>
        <caption>
          Median ± half the IQR, {RUNS} runs after {WARMUP} warm-up. A library whose first run takes over{' '}
          {SLOW_MS / 1000} s is measured once (marked 1 run).
          {!isGallery(chart) && ' Survival and Scatter share one token count.'} Green is a column's lowest
          value and red its highest; timing columns rank only when the gap exceeds 2 frames.
        </caption>
        <thead>
          <tr>
            <th scope="col">Library</th>
            <th scope="col">Mount (ms)</th>
            <th scope="col">Update (ms)</th>
            <th scope="col">Blocking (ms)</th>
            <th scope="col">DOM nodes</th>
            <th scope="col">Bundle (KB gz)</th>
            <th scope="col">Code (tokens)</th>
            <th scope="col">Hover max frame (ms)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([lib, r, isFloor]) => {
            const kb = isFloor ? bundleKb.shell?.libraryKb : libraryKb(lib, chart);
            const tokens = tokenCount(lib, chart);
            const rank = (of: (value: number | undefined) => Rank | undefined, value?: number) =>
              isFloor ? undefined : of(value);
            return (
              <tr
                key={lib}
                data-lib={lib}
                data-samples={r.mount.n}
                data-mount={r.mount.median}
                data-update={r.update.median}
                data-blocking={r.blocking?.median ?? ''}
                data-dom-nodes={r.timedOut ? '' : r.domNodes}
                data-bundle-kb={kb ?? ''}
              >
                <th scope="row">
                  {lib}
                  {!r.timedOut && r.mount.n === 1 && <span className="lib-sub"> · 1 run</span>}
                  {r.probeMs && <span className="lib-sub"> · skipped</span>}
                </th>
                <Cell
                  s={r.mount}
                  floor={isFloor ? undefined : measured.floor.mount}
                  frame={frame}
                  rank={rank(ranks.mount, r.mount.median)}
                  skipped={!!r.probeMs}
                />
                <Cell
                  s={r.update}
                  floor={isFloor ? undefined : measured.floor.update}
                  frame={frame}
                  rank={rank(ranks.update, r.update.median)}
                  skipped={!!r.probeMs}
                />
                <Cell s={r.blocking} frame={frame} rank={rank(ranks.blocking, r.blocking?.median)} />
                <td {...cellProps(rank(ranks.domNodes, r.domNodes))}>{r.timedOut ? 'n/a' : r.domNodes}</td>
                <td {...cellProps(rank(ranks.kb, kb))}>{kb?.toFixed(1) ?? 'n/a'}</td>
                <td {...cellProps(rank(ranks.tokens, tokens))}>{tokens ?? 'n/a'}</td>
                <td data-hover={hover[lib] ?? ''} {...cellProps(rank(ranks.hover, hover[lib]))}>
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

type Job = { libraries: Library[]; unsupported: Library[]; data: Parsed; probe?: Parsed };

function Lab({
  job,
  query,
  onDone,
  onFail,
  onCancel,
}: {
  job: Job;
  query: URLSearchParams;
  onDone: (m: Measurements, period: number) => void;
  onFail: (message: string) => void;
  onCancel: () => void;
}) {
  const card = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [library, setLibrary] = useState<{ name: string; index: number; total: number } | null>(null);
  const [run, setRun] = useState<{ n: number; total: number } | null>(null);
  const [waiting, setWaiting] = useState<string | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    card.current!.scrollIntoView({ block: 'nearest' });
    measureAll(stage.current!, job.libraries, job.data, {
      query,
      requireIsolation: !!job.probe,
      probe: job.probe,
      onWait: name => setWaiting(name),
      signal: abort.signal,
      onProgress: (done, total, name) => {
        setWaiting(null);
        setLibrary({ name, index: done + 1, total });
      },
      onRun: (n, total) => setRun({ n, total }),
    })
      // Calibrated before the cards mount: their animation would drop frames and widen the margin.
      .then(async m => ({ m, period: await framePeriod() }))
      .then(
        ({ m, period }) => !abort.signal.aborted && onDone(m, period),
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
          <div ref={stage} />
          <div className="lab-panel">
            <div className="spinner" aria-hidden="true" />
            <h2>Measuring…</h2>
            {library && (
              <p>
                {library.name === 'shell' ? 'Empty page (baseline)' : LABELS[library.name as Library]}
                {' · '}library {library.index} of {library.total}
                {run &&
                  ` · ${run.n === 0 ? 'heavy-sample check' : run.n <= WARMUP ? 'warm-up' : `run ${run.n - WARMUP} of ${run.total - WARMUP}`}`}
              </p>
            )}
            {waiting && (
              <p>
                {LABELS[waiting as Library]} timed out but is still drawing in the background, and the browser
                cannot interrupt it. The next library starts when it finishes.
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
params.delete('effects');
const initialLibraries: Library[] = requested.length ? requested : ['recharts', 'echarts'];
const initialText = sample('survival', 'typical');

function Playground() {
  const [job, setJob] = useState<Job | null>(null);
  const [measured, setMeasured] = useState<Measurements | null>(null);
  const [shown, setShown] = useState<Job | null>(() => ({
    libraries: (Object.keys(LABELS) as Library[]).filter(l => initialLibraries.includes(l)),
    unsupported: [],
    data: parseSeries('survival', initialText),
  }));
  const [hover, setHover] = useState<Record<string, number>>({});
  const [frame, setFrame] = useState(16.7);
  const [runError, setRunError] = useState('');
  const [chart, setChart] = useState<ChartKind>('survival');
  const [effects, setEffects] = useState(true);
  const [libraries, setLibraries] = useState(initialLibraries);
  const [text, setText] = useState(initialText);
  const [size, setSize] = useState<DatasetSize | 'custom'>('typical');
  const [dataOpen, setDataOpen] = useState(false);
  const [error, setError] = useState('');

  const apply = (nextChart: ChartKind, nextText: string) => {
    try {
      const parsed = parseSeries(nextChart, nextText);
      setError('');
      return parsed;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDataOpen(true);
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
      probe: size === 'huge' ? parseSeries(chart, sample(chart, 'heavy')) : undefined,
    });
  };
  const endJob = () => {
    if (job && job.unsupported.length)
      setShown({ libraries: [], unsupported: job.unsupported, data: job.data });
    setJob(null);
  };
  const load = (nextChart: ChartKind, nextSize: DatasetSize) => {
    const next = sample(nextChart, nextSize);
    setChart(nextChart);
    setSize(nextSize);
    setText(next);
    apply(nextChart, next);
  };
  const toggle = (lib: Library) =>
    setLibraries(cur => (cur.includes(lib) ? cur.filter(l => l !== lib) : [...cur, lib]));

  return (
    <main>
      <aside className="side">
        <header className="intro">
          <h1>chart-bench playground</h1>
          <p>Fourteen chart libraries draw the same chart from the same data. Pick some, render, compare.</p>
        </header>

        <fieldset disabled={!!job} className="block">
          <legend>
            Libraries{' '}
            <span className="count">
              {libraries.length} of {Object.keys(LIBRARIES).length}
            </span>
            <span className="quick">
              <button type="button" onClick={() => setLibraries(Object.keys(LIBRARIES) as Library[])}>
                Select all
              </button>
              <button type="button" onClick={() => setLibraries([])} disabled={libraries.length === 0}>
                Clear
              </button>
            </span>
          </legend>
          <div className="libs">
            {(Object.keys(LIBRARIES) as (keyof typeof META)[]).map(lib => {
              const meta = META[lib];
              const can = supported(lib, chart);
              return (
                <label key={lib} className={`lib${can ? '' : ' cannot'}`}>
                  <input type="checkbox" checked={libraries.includes(lib)} onChange={() => toggle(lib)} />
                  <Logo meta={meta} />
                  <span className="lib-text">
                    <span className="lib-name">{meta.name}</span>
                    <span className="lib-sub">
                      {can ? meta.renderer : `No ${kindInfo(chart).label.toLowerCase()}`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset disabled={!!job} className="block">
          <legend>Chart</legend>
          <div className="kinds">
            {kinds.map(kind => (
              <label key={kind} className="kind">
                <input
                  type="radio"
                  name="chart"
                  checked={chart === kind}
                  onChange={() => load(kind, 'typical')}
                />
                {GLYPHS[kind]}
                <span>{kindInfo(kind).label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={!!job} className="block">
          <legend>Data</legend>
          <p className="hint">{kindInfo(chart).hint}</p>
          <div className="samples" role="group" aria-label="Sample data size">
            <span className="samples-label">Size</span>
            <button
              type="button"
              aria-pressed={size === 'typical'}
              onClick={() => load(chart, 'typical')}
              aria-label="Sample: typical"
            >
              Typical
            </button>
            <button
              type="button"
              aria-pressed={size === 'heavy'}
              onClick={() => load(chart, 'heavy')}
              aria-label="Sample: heavy"
            >
              Heavy
            </button>
            {hasSize(chart, 'huge') && (
              <button
                type="button"
                aria-pressed={size === 'huge'}
                onClick={() => load(chart, 'huge')}
                aria-label="Sample: ~100k"
              >
                ~100k
              </button>
            )}
          </div>
          {size === 'huge' && (
            <p className="warn">
              Each library first draws the heavy sample and is skipped if that takes over {SLOW_MS / 1000} s.
              The rest run at ~100k in a separate browser process, so this tab stays usable: a run over{' '}
              {TIMEOUT_MS / 1000} s is marked timed out, though the next library waits until its drawing ends.
              Needs Chrome or Edge.
            </p>
          )}
          <div className={`json${dataOpen ? ' open' : ''}`}>
            <div className="json-bar">
              <span>
                {size === 'custom'
                  ? 'Your data'
                  : `${size === 'huge' ? '~100k' : size[0]!.toUpperCase() + size.slice(1)} sample`}
                <span className="lib-sub">
                  {' '}
                  · {(text.length / 1024).toFixed(text.length < 10_240 ? 1 : 0)} KB of JSON
                </span>
              </span>
              <button type="button" aria-expanded={dataOpen} onClick={() => setDataOpen(open => !open)}>
                {dataOpen ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <textarea
              value={text}
              onChange={e => {
                setText(e.target.value);
                setSize('custom');
              }}
              spellCheck={false}
              aria-label="Chart data as JSON"
            />
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </fieldset>

        <label className="effects">
          <input
            type="checkbox"
            checked={effects}
            onChange={() => {
              setEffects(on => !on);
              setHover({});
            }}
          />
          <span>
            Animation and hover effects
            <small>Shown on the charts and in the hover column. Mount and update stay static.</small>
          </span>
        </label>

        <div className="go">
          <button className="primary" onClick={measure} disabled={!!job}>
            Render
          </button>
          <small>
            Render measures each library alone in a fresh page, one after another. The charts before a run are
            an unmeasured preview. Numbers compare within this session only.
          </small>
        </div>
      </aside>

      <div className="charts">
        {job && (
          <Lab
            job={job}
            query={params}
            onDone={(m, period) => {
              setFrame(period);
              setMeasured(m);
              setShown(job);
              setJob(null);
            }}
            onFail={message => {
              setRunError(message);
              endJob();
            }}
            onCancel={endJob}
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
            key={`${lib}-${effects}`}
            library={lib}
            data={shown.data}
            effects={effects}
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
