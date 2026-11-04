// Gzipped JS + CSS one gallery wrapper adds over a bare React mount, one isolated build per pair.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import react from '@vitejs/plugin-react';
import { build } from 'vite';

const root = resolve(import.meta.dirname, '..');
const STUB = '\0gallery-stub';

async function sizeOf(wrapper) {
  const source = wrapper
    ? `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import mod from ${JSON.stringify(wrapper)};
createRoot(document.body).render(createElement(mod.Chart, {}));`
    : `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
createRoot(document.body).render(createElement('div'));`;
  const stub = {
    name: 'gallery-stub',
    resolveId: id => (id === STUB ? id : null),
    load: id => (id === STUB ? source : null),
  };
  const out = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [react(), stub],
    build: { write: false, rollupOptions: { input: STUB } },
  });
  return [out].flat().flatMap(o => o.output).reduce((bytes, file) => {
    if (file.type === 'chunk' && file.fileName.endsWith('.js'))
      return bytes + gzipSync(file.code, { level: 9 }).length;
    if (file.type === 'asset' && file.fileName.endsWith('.css'))
      return bytes + gzipSync(file.source, { level: 9 }).length;
    return bytes;
  }, 0);
}

const pairs = [];
const arms = resolve(root, 'src/arms');
for (const lib of readdirSync(arms)) {
  const dir = resolve(arms, lib, 'gallery');
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter(f => f.endsWith('.tsx')))
    pairs.push([lib, file.replace(/\.tsx$/, ''), resolve(dir, file)]);
}

const result = {};
if (pairs.length) {
  const floor = await sizeOf(null);
  for (const [lib, type, file] of pairs)
    (result[lib] ??= {})[type] = { libraryKb: +(((await sizeOf(file)) - floor) / 1024).toFixed(1) };
}
mkdirSync(resolve(root, 'results'), { recursive: true });
writeFileSync(resolve(root, 'results/gallery-bundle.json'), JSON.stringify(result, null, 2) + '\n');
console.table(result);
