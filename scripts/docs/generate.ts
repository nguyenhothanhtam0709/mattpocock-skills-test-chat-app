// Thin CLI: reads the repo, writes the Generated Docs that live at the root. Untested on purpose;
// the logic is in the pure generators next to it.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { renderAdrIndex } from './adr-index.ts';
import { renderPackageGraph } from './package-graph.ts';

const root = new URL('../../', import.meta.url);

const adrDir = new URL('docs/adr/', root);
const adrs = readdirSync(adrDir)
  .filter((name) => /^\d{4}-.*\.md$/.test(name))
  .map((file) => ({ file, content: readFileSync(new URL(file, adrDir), 'utf8') }));
writeFileSync(new URL('docs/architecture/adr-index.md', root), renderAdrIndex(adrs));

const packagesDir = new URL('packages/', root);
const manifests = readdirSync(packagesDir).map((dir) =>
  JSON.parse(readFileSync(new URL(`${dir}/package.json`, packagesDir), 'utf8')),
);
writeFileSync(new URL('docs/architecture/package-graph.md', root), renderPackageGraph(manifests));
