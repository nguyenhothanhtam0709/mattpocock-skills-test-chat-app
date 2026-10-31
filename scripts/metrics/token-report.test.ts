import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderReport, summarizeTranscript } from './token-report.ts';

const assistant = (
  requestId: string,
  content: string[],
  usage: object,
  model = 'claude-opus-5-5',
) =>
  JSON.stringify({
    type: 'assistant',
    requestId,
    message: { model, usage, content: content.map((type) => ({ type })) },
  });
const usage = (input: number, write: number, read: number, output: number) => ({
  input_tokens: input,
  cache_creation_input_tokens: write,
  cache_read_input_tokens: read,
  output_tokens: output,
});

test('lines of one request count as one call, with its usage counted once', () => {
  const lines = [
    assistant('a', ['thinking'], usage(1, 10, 100, 5)),
    assistant('a', ['text', 'tool_use'], usage(1, 10, 100, 9)),
    JSON.stringify({ type: 'user', message: {} }),
    assistant('b', ['tool_use'], usage(2, 20, 200, 3)),
    'not json',
  ];
  assert.deepEqual(summarizeTranscript(lines), {
    model: 'claude-opus-5-5',
    calls: 2,
    toolCalls: 2,
    input: 3,
    cacheWrite: 30,
    cacheRead: 300,
    output: 12,
  });
});

test('an empty transcript has no model and no tokens', () => {
  assert.deepEqual(summarizeTranscript([]), {
    model: 'unknown',
    calls: 0,
    toolCalls: 0,
    input: 0,
    cacheWrite: 0,
    cacheRead: 0,
    output: 0,
  });
});

test('the report has a row per agent and a total', () => {
  const summary = { ...summarizeTranscript([]), calls: 2, cacheRead: 5 };
  const report = renderReport([
    { label: 'main session', summary },
    { label: 'Merge PR', summary },
  ]);
  assert.match(report, /\| main session \| unknown \| 2 \|/);
  assert.match(report, /\| Merge PR \|/);
  assert.match(report, /\| Total \| {2}\| 4 \| 0 \| 0 \| 0 \| 10 \| 0 \|/);
});
