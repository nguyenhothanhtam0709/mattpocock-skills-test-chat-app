# 07: Generated Docs

**What to build:** `pnpm docs:generate` at the root writes five Generated Docs into `docs/architecture/`, as Markdown with Mermaid diagrams: the ER diagram from the Drizzle schema, the HTTP route list (read from controller route metadata without booting the app or a database), the realtime event list (event names and payload schemas), the workspace package graph, and the ADR index (title and first sentence of each ADR, linked). Each generator is a pure function from its source to a Markdown string and lives with its source: ER and routes in the API package, realtime events in contracts, package graph and ADR index at the root (TypeScript run directly by Node, tested with Node's built-in test runner). Each output has front matter `kind: generated`, `generator` and `source`, and a "do not edit" line.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] No package is added, removed or upgraded
- [x] Each generator has tests that feed it real source and assert on the Markdown (API and contracts with their existing test setup; root with Node's built-in runner)
- [x] Running `pnpm docs:generate` twice in a row leaves no diff
- [x] The five docs are committed and match the current code
- [x] `pnpm typecheck`, `pnpm test` and `pnpm lint` pass

## Comments
