// Gzipped JS + CSS each entry loads before first render, minus the no-library shell.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

import { ARMS } from '../src/data/arms.ts';

const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const gz = file => gzipSync(readFileSync(`dist/${file}`), { level: 9 }).length;

function entryBytes(key, seen = new Set()) {
  if (seen.has(key)) return 0;
  seen.add(key);
  const chunk = manifest[key];
  let bytes =
    gz(chunk.file) +
    (chunk.css ?? []).filter(f => !seen.has(f) && seen.add(f)).reduce((n, f) => n + gz(f), 0);
  for (const dep of chunk.imports ?? []) bytes += entryBytes(dep, seen);
  return bytes;
}

const totals = Object.fromEntries(
  Object.entries(manifest)
    .filter(([key, chunk]) => chunk.isEntry && ARMS.some(arm => key === `${arm}.html`))
    .map(([key]) => [key.replace('.html', ''), entryBytes(key)]),
);
const result = Object.fromEntries(
  Object.entries(totals).map(([arm, bytes]) => [
    arm,
    { totalKb: +(bytes / 1024).toFixed(1), libraryKb: +((bytes - totals.shell) / 1024).toFixed(1) },
  ]),
);
mkdirSync('results', { recursive: true });
writeFileSync('results/bundle.json', JSON.stringify(result, null, 2) + '\n');
console.table(result);
