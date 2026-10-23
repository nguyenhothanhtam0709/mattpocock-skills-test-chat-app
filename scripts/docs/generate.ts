// Thin CLI behind `pnpm docs:generate`: reads the repo, writes the five Generated Docs. The API
// and contracts generators are imported from their built `dist/` (the root script builds them
// first). Untested on purpose; the logic is in the pure generators.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { generateApiDocs } from '../../packages/api/dist/docs/generate-docs.js';
import { renderRealtimeEvents } from '../../packages/contracts/dist/realtime-events-doc.js';
import { renderAdrIndex } from './adr-index.ts';
import { renderPackageGraph } from './package-graph.ts';

const root = new URL('../../', import.meta.url);
const outDir = new URL('docs/architecture/', root);
mkdirSync(outDir, { recursive: true });
const write = (file: string, markdown: string) => writeFileSync(new URL(file, outDir), markdown);

const adrDir = new URL('docs/adr/', root);
const adrs = readdirSync(adrDir)
  .filter((name) => /^\d{4}-.*\.md$/.test(name))
  .map((file) => ({ file, content: readFileSync(new URL(file, adrDir), 'utf8') }));
write('adr-index.md', renderAdrIndex(adrs));

const packagesDir = new URL('packages/', root);
const manifests = readdirSync(packagesDir).map((dir) =>
  JSON.parse(readFileSync(new URL(`${dir}/package.json`, packagesDir), 'utf8')),
);
write('package-graph.md', renderPackageGraph(manifests));

const api = generateApiDocs();
write('er-diagram.md', api.erDiagram);
write('http-routes.md', api.routes);
write('realtime-events.md', renderRealtimeEvents());
