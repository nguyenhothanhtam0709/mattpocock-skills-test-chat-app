# 06: Package AGENTS.md files

**What to build:** An agent starting work in any package finds its rules. Add one `AGENTS.md` to each of `api`, `web` and `contracts`, in short sentences and links only: what the package is; its commands and what they need (API tests need Docker and the database up); links to its conventions file, its relevant ADRs and reference files; its hard "never" rules (API: never hand-edit migrations, IDs and timestamps come from the DB; web: don't hand-edit the shadcn/ui components, use the shadcn skill; contracts: a breaking schema change updates API and web in the same PR). The API and contracts files say to run `pnpm docs:generate` after changing the schema, routes or realtime events. In the root `AGENTS.md`, below the `## Agent skills` block, add a "Packages" section routing to each package file and a link to general conventions.

**Blocked by:** 01, 05

**Status:** resolved

- [x] Three package `AGENTS.md` files, each at or under about 40 lines
- [x] No rule is restated; each links to the one doc that holds it
- [x] Root `AGENTS.md` links every package file and general conventions, stays at or under about 40 lines, and the `## Agent skills` block is unchanged
- [x] Every link resolves
- [x] `pnpm lint` passes

## Comments
