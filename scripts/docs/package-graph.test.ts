import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderPackageGraph } from './package-graph.ts';

const packagesDir = new URL('../../packages/', import.meta.url);
const manifests = readdirSync(packagesDir).map((dir) =>
  JSON.parse(readFileSync(new URL(`${dir}/package.json`, packagesDir), 'utf8')),
);

test('package graph draws the workspace dependencies of the real packages', () => {
  const markdown = renderPackageGraph(manifests);

  assert.match(markdown, /```mermaid\ngraph LR\n/);
  assert.match(markdown, /@chat\/api"\] --> .*@chat\/contracts"\]/);
  assert.match(markdown, /@chat\/web"\] --> .*@chat\/contracts"\]/);
  assert.doesNotMatch(markdown, /contracts"\] --> /);
  assert.ok(!markdown.includes('zod'), 'only workspace packages appear');
});

test('package graph declares itself generated', () => {
  const markdown = renderPackageGraph(manifests);

  assert.match(
    markdown,
    /^---\nkind: generated\ngenerator: scripts\/docs\/package-graph\.ts\nsource: packages\/\*\/package\.json\n---\n/,
  );
  assert.match(markdown, /Do not edit/);
});

test('package graph is stable when the input order changes', () => {
  assert.equal(renderPackageGraph([...manifests].reverse()), renderPackageGraph(manifests));
});
