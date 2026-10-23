import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { renderAdrIndex } from './adr-index.ts';

const adrDir = new URL('../../docs/adr/', import.meta.url);
const adrs = readdirSync(adrDir)
  .filter((name) => /^\d{4}-.*\.md$/.test(name))
  .sort()
  .map((file) => ({ file, content: readFileSync(new URL(file, adrDir), 'utf8') }));

test('ADR index links every real ADR with its title and first sentence', () => {
  const markdown = renderAdrIndex(adrs);

  assert.match(
    markdown,
    /- \[0001: The WebSocket is a server-push-only channel\]\(\.\.\/adr\/0001-websocket-is-server-push-only\.md\): Clients perform every write \(sending Messages, managing Groups, auth\) over HTTP; .*client-emitted event is ignored\./,
  );
  assert.match(
    markdown,
    /- \[0006: The API runs as a single instance\]\(\.\.\/adr\/0006-api-runs-as-a-single-instance\.md\): The API is deployed as exactly one process\.\n/,
  );
  for (const { file } of adrs) assert.ok(markdown.includes(`(../adr/${file})`), file);
});

test('ADR index declares itself generated', () => {
  const markdown = renderAdrIndex(adrs);

  assert.match(
    markdown,
    /^---\nkind: generated\ngenerator: scripts\/docs\/adr-index\.ts\nsource: docs\/adr\/\*\.md\n---\n/,
  );
  assert.match(markdown, /Do not edit/);
});

test('ADR index is stable when the input order changes', () => {
  assert.equal(renderAdrIndex([...adrs].reverse()), renderAdrIndex(adrs));
});
