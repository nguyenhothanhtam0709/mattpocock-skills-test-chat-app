// Prints the real token use of a Claude Code session, per agent, main session included:
//   pnpm metrics:tokens [session-id]   (latest session of this repo when omitted)
// The transcript writes one line per content block, so a request's usage repeats; count it once.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface TokenSummary {
  model: string;
  calls: number;
  toolCalls: number;
  input: number;
  cacheWrite: number;
  cacheRead: number;
  output: number;
}

interface AssistantLine {
  type?: string;
  requestId?: string;
  message?: {
    model?: string;
    content?: { type?: string }[];
    usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      output_tokens?: number;
    };
  };
}

const parseLine = (line: string): AssistantLine | null => {
  try {
    return JSON.parse(line) as AssistantLine;
  } catch {
    return null;
  }
};

export const summarizeTranscript = (lines: string[]): TokenSummary => {
  const lastUsage = new Map<string, NonNullable<NonNullable<AssistantLine['message']>['usage']>>();
  let model = 'unknown';
  let toolCalls = 0;
  for (const line of lines) {
    const parsed = parseLine(line);
    if (parsed?.type !== 'assistant' || !parsed.message) continue;
    model = parsed.message.model ?? model;
    toolCalls += (parsed.message.content ?? []).filter((block) => block.type === 'tool_use').length;
    if (parsed.requestId && parsed.message.usage) {
      lastUsage.set(parsed.requestId, parsed.message.usage);
    }
  }
  const summary: TokenSummary = {
    model,
    calls: lastUsage.size,
    toolCalls,
    input: 0,
    cacheWrite: 0,
    cacheRead: 0,
    output: 0,
  };
  for (const usage of lastUsage.values()) {
    summary.input += usage.input_tokens ?? 0;
    summary.cacheWrite += usage.cache_creation_input_tokens ?? 0;
    summary.cacheRead += usage.cache_read_input_tokens ?? 0;
    summary.output += usage.output_tokens ?? 0;
  }
  return summary;
};

export const renderReport = (agents: { label: string; summary: TokenSummary }[]): string => {
  const row = (label: string, model: string, s: Omit<TokenSummary, 'model'>) =>
    `| ${label} | ${model} | ${s.calls} | ${s.toolCalls} | ${s.input} | ${s.cacheWrite} | ${s.cacheRead} | ${s.output} |`;
  const total = { calls: 0, toolCalls: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
  for (const { summary } of agents) {
    for (const key of Object.keys(total) as (keyof typeof total)[]) total[key] += summary[key];
  }
  return [
    '| Agent | Model | Calls | Tool calls | Input | Cache write | Cache read | Output |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...agents.map(({ label, summary }) => row(label, summary.model, summary)),
    row('Total', '', total),
  ].join('\n');
};

const readLines = (file: string) => readFileSync(file, 'utf8').split('\n');

const latestSession = (projectDir: string): string => {
  const [latest] = readdirSync(projectDir)
    .filter((name) => name.endsWith('.jsonl'))
    .sort((a, b) => statSync(join(projectDir, b)).mtimeMs - statSync(join(projectDir, a)).mtimeMs);
  if (!latest) throw new Error(`No session in ${projectDir}`);
  return latest.replace(/\.jsonl$/, '');
};

const subagentLabel = (metaFile: string, fallback: string): string => {
  if (!existsSync(metaFile)) return fallback;
  const meta = JSON.parse(readFileSync(metaFile, 'utf8')) as { description?: string };
  return meta.description ?? fallback;
};

if (import.meta.main) {
  const projectDir = join(
    homedir(),
    '.claude/projects',
    process.cwd().replace(/[^a-zA-Z0-9]/g, '-'),
  );
  const session = process.argv[2] ?? latestSession(projectDir);
  const agents = [
    {
      label: 'main session',
      summary: summarizeTranscript(readLines(join(projectDir, `${session}.jsonl`))),
    },
  ];
  const subagentDir = join(projectDir, session, 'subagents');
  if (existsSync(subagentDir)) {
    for (const file of readdirSync(subagentDir).filter((name) => name.endsWith('.jsonl'))) {
      agents.push({
        label: subagentLabel(join(subagentDir, file.replace(/\.jsonl$/, '.meta.json')), file),
        summary: summarizeTranscript(readLines(join(subagentDir, file))),
      });
    }
  }
  console.log(`Session ${session}\n\n${renderReport(agents)}`);
}
