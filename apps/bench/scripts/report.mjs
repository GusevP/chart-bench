// Turns results/raw.jsonl + results/bundle.json into the markdown tables the article uses.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { summarize } from 'bench-stage/stats';

const input = process.argv[2] ?? 'results/raw.jsonl';
const rows = readFileSync(input, 'utf8')
  .trim()
  .split('\n')
  .map(line => JSON.parse(line));
const bundle = existsSync('results/bundle.json')
  ? JSON.parse(readFileSync('results/bundle.json', 'utf8'))
  : {};

const arms = [...new Set(rows.map(r => r.arm))];
const cases = [...new Set(rows.map(r => `${r.chart}-${r.size}`))];
const fmt = ({ median, iqr }) =>
  Number.isNaN(median) ? '—' : `${median.toFixed(1)} ±${(iqr / 2).toFixed(1)}`;

// A timed-out run counts as slower than every finished one, so the median stays honest.
function mountCell(cell) {
  const timedOut = cell.filter(r => r.timedOut);
  if (!timedOut.length) return fmt(summarize(cell.map(r => r.mountMs)));
  const done = cell.filter(r => !r.timedOut).map(r => r.mountMs).sort((a, b) => a - b);
  const all = [...done, ...timedOut.map(() => Infinity)];
  const median = all[Math.floor((all.length - 1) / 2)];
  const cap = `${timedOut[0].timeoutMs / 1000} s`;
  const note = `${timedOut.length}/${all.length} timed out`;
  if (median !== Infinity) return `${median.toFixed(1)} (${note})`;
  return `> ${cap} (${note}${done.length ? `, slowest finished ${done.at(-1).toFixed(1)}` : ''})`;
}

let md = '';
for (const metric of ['mountMs', 'naiveMs', 'maxFrameMs', 'domNodes']) {
  md += `\n### ${metric} (median ±IQR/2, n per cell shown in raw data)\n\n| library | ${cases.join(' | ')} |\n|---|${cases.map(() => '---:').join('|')}|\n`;
  for (const arm of arms) {
    const cells = cases.map(c => {
      const cell = rows.filter(r => r.arm === arm && `${r.chart}-${r.size}` === c);
      if (metric === 'mountMs') return mountCell(cell);
      const values = cell.filter(r => !r.timedOut).map(r => r[metric]);
      return metric === 'domNodes' ? String(summarize(values).median) : fmt(summarize(values));
    });
    md += `| ${arm} | ${cells.join(' | ')} |\n`;
  }
}
md += '\n### Bundle (gzip, KB)\n\n| library | total | library cost |\n|---|---:|---:|\n';
for (const [arm, b] of Object.entries(bundle)) md += `| ${arm} | ${b.totalKb} | ${b.libraryKb} |\n`;

writeFileSync(input.replace(/\.jsonl$/, '.md'), md);
console.log(md);
