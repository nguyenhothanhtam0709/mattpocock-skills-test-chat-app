import { generatedDocHeader } from './generated-doc-header.ts';

export type AdrSource = { file: string; content: string };

const GENERATOR = 'scripts/docs/adr-index.ts';
const SOURCE = 'docs/adr/*.md';

/** First sentence of the first paragraph after the title, on one line. */
function firstSentence(content: string): string {
  const paragraph = content
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .find((block) => block !== '' && !block.startsWith('#') && !block.startsWith('---'));
  if (paragraph === undefined) return '';
  const text = paragraph.replace(/\s*\n\s*/g, ' ');
  return /^.+?[.!?](?=\s|$)/.exec(text)?.[0] ?? text;
}

function title(content: string): string {
  return /^# (.+)$/m.exec(content)?.[1]?.trim() ?? '';
}

/** Markdown index of the ADRs: number, title and first sentence of each, linked. */
export function renderAdrIndex(adrs: readonly AdrSource[]): string {
  const lines = [...adrs]
    .sort((a, b) => a.file.localeCompare(b.file))
    .map(({ file, content }) => {
      const number = file.slice(0, 4);
      return `- [${number}: ${title(content)}](../adr/${file}): ${firstSentence(content)}`;
    });
  return [
    ...generatedDocHeader({ generator: GENERATOR, source: SOURCE, title: 'ADR index' }),
    ...lines,
    '',
  ].join('\n');
}
