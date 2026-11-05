// Tokens of TypeScript-normalized JS/JSX per chart: the chart file plus every file it reaches under src/arms.
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const arms = resolve(root, 'src/arms');
const LIBS = ['recharts', 'nivo', 'echarts', 'chartjs', 'visx', 'tanstack', 'none'];
const SPEC_CHARTS = 'survival+scatter';

function scan(source, fileName) {
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      jsx: ts.JsxEmit.Preserve,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    },
  });
  const sf = ts.createSourceFile(fileName, outputText, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TSX);
  const leaves = node => {
    const children = node.getChildren(sf);
    if (children.length) return children.reduce((sum, child) => sum + leaves(child), 0);
    if (node.kind === ts.SyntaxKind.SyntaxList || node.kind === ts.SyntaxKind.EndOfFileToken) return 0;
    return ts.isJsxText(node) && node.containsOnlyTriviaWhiteSpaces ? 0 : 1;
  };
  const imports = sf.statements.filter(ts.isImportDeclaration);
  return {
    tokens: sf.statements.reduce((sum, s) => sum + (ts.isImportDeclaration(s) ? 0 : leaves(s)), 0),
    imports: imports.map(i => i.moduleSpecifier.text),
  };
}

assert.equal(scan("import x from 'y';\nconst a: number = x as const;\n", 'check.tsx').tokens, 5);

const files = new Map();
function fileScan(file) {
  if (!files.has(file)) files.set(file, scan(readFileSync(file, 'utf8'), file));
  return files.get(file);
}

function reachable(file, seen = new Set()) {
  seen.add(file);
  for (const spec of fileScan(file).imports) {
    if (!spec.startsWith('.')) continue;
    const base = resolve(dirname(file), spec);
    if (!base.startsWith(arms + sep)) continue;
    const target = [`${base}.ts`, `${base}.tsx`].find(existsSync);
    assert(target, `${file} imports ${spec}`);
    if (!seen.has(target)) reachable(target, seen);
  }
  return seen;
}

function measure(entries) {
  const counted = new Set(entries.flatMap(entry => [...reachable(entry)]));
  const result = { chart: 0, adapter: 0, shared: 0, total: 0 };
  for (const file of counted) {
    const { tokens } = fileScan(file);
    const path = relative(arms, file);
    const bucket = entries.includes(file) ? 'chart' : path.startsWith('shared') ? 'shared' : 'adapter';
    result[bucket] += tokens;
    result.total += tokens;
  }
  return { ...result, files: [...counted].map(file => relative(root, file)).sort() };
}

const pairs = Object.fromEntries(LIBS.map(lib => [lib, { [SPEC_CHARTS]: resolve(arms, lib, 'charts.tsx') }]));
for (const lib of LIBS) {
  const dir = resolve(arms, lib, 'gallery');
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter(f => f.endsWith('.tsx')))
    pairs[lib][file.replace(/\.tsx$/, '')] = resolve(dir, file);
}

const galleryLibs = LIBS.filter(lib => lib !== 'none');
const types = [...new Set(galleryLibs.flatMap(lib => Object.keys(pairs[lib])))].sort();
const galleryTypes = types.filter(type => type !== SPEC_CHARTS);
const common = galleryTypes.filter(type => galleryLibs.every(lib => pairs[lib][type]));

const perChart = {};
const totals = {};
for (const lib of LIBS) {
  perChart[lib] = Object.fromEntries(
    Object.entries(pairs[lib]).map(([type, file]) => [type, measure([file])]),
  );
  const implemented = Object.keys(pairs[lib]).filter(type => type !== SPEC_CHARTS);
  totals[lib] = { coverage: implemented.length };
  if (implemented.length) {
    totals[lib].common = measure(common.map(type => pairs[lib][type]));
  }
}

writeFileSync(
  resolve(root, 'results/code-tokens.json'),
  JSON.stringify({ commonTypes: common, totals, perChart }, null, 2) + '\n',
);

const row = cells => `| ${cells.join(' | ')} |`;
const head = ['Chart', ...LIBS];
const cell = (lib, type) => perChart[lib][type]?.total ?? 'N/A';
const lines = [
  row(head),
  row(head.map((_, i) => (i ? '---:' : '---'))),
  row([SPEC_CHARTS, ...LIBS.map(lib => cell(lib, SPEC_CHARTS))]),
  ...galleryTypes.map(type => row([type, ...LIBS.map(lib => cell(lib, type))])),
  '',
  row([`Common ${common.length} types`, 'Chart files', 'Adapter', 'arms/shared', 'Total', 'Coverage']),
  row(['---', '---:', '---:', '---:', '---:', '---:']),
  ...galleryLibs.map(lib => {
    const { chart, adapter, shared, total } = totals[lib].common;
    return row([lib, chart, adapter, shared, total, `${totals[lib].coverage}/${galleryTypes.length}`]);
  }),
];
console.log(lines.join('\n'));
