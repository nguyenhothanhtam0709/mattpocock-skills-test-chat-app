import { generatedDocHeader } from './generated-doc-header.ts';

export interface PackageManifest {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const GENERATOR = 'scripts/docs/package-graph.ts';
const SOURCE = 'packages/*/package.json';

const isWorkspaceDependency = (range: string) => range.startsWith('workspace:');

/** Markdown with a Mermaid graph of the workspace packages; an arrow means "depends on". */
export function renderPackageGraph(manifests: readonly PackageManifest[]): string {
  const sorted = [...manifests].sort((a, b) => a.name.localeCompare(b.name));
  const node = (name: string) => `${name.replace(/\W/g, '_')}["${name}"]`;

  const nodes = sorted.map((m) => `  ${node(m.name)}`);
  const edges = sorted.flatMap((m) =>
    Object.entries({ ...m.dependencies, ...m.devDependencies })
      .filter(([, range]) => isWorkspaceDependency(range))
      .map(([name]) => name)
      .sort()
      .map((dependency) => `  ${node(m.name)} --> ${node(dependency)}`),
  );

  return [
    ...generatedDocHeader({ generator: GENERATOR, source: SOURCE, title: 'Package graph' }),
    'An arrow means "depends on".',
    '',
    '```mermaid',
    'graph LR',
    ...nodes,
    ...edges,
    '```',
    '',
  ].join('\n');
}
