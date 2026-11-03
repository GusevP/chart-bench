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

let md = '';
for (const metric of ['mountMs', 'naiveMs', 'maxFrameMs', 'domNodes']) {
  md += `\n### ${metric} (median ±IQR/2, n per cell shown in raw data)\n\n| library | ${cases.join(' | ')} |\n|---|${cases.map(() => '---:').join('|')}|\n`;
  for (const arm of arms) {
    const cells = cases.map(c => {
      const values = rows.filter(r => r.arm === arm && `${r.chart}-${r.size}` === c).map(r => r[metric]);
      return metric === 'domNodes' ? String(summarize(values).median) : fmt(summarize(values));
    });
    md += `| ${arm} | ${cells.join(' | ')} |\n`;
  }
}
md += '\n### Bundle (gzip, KB)\n\n| library | total | library cost |\n|---|---:|---:|\n';
for (const [arm, b] of Object.entries(bundle)) md += `| ${arm} | ${b.totalKb} | ${b.libraryKb} |\n`;

writeFileSync(input.replace(/\.jsonl$/, '.md'), md);
console.log(md);
