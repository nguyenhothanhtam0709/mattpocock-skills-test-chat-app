# 01: Setup covers worktrees, adding a dependency and the browser check

**What to build:** A dry run of a fresh agent on an existing Ticket (`.scratch/00003-client-side-router/issues/01-adopt-react-router.md`) showed three things `docs/workflow/setup.md` does not say. Add them there, as commands and gotchas only. Rules stay in their own docs (spec story 3). Docs only; touches `docs/workflow/setup.md` and nothing else.

- **A second worktree:** `.env` and `node_modules` are git-ignored, so a new worktree has neither. Say to run `pnpm install` and copy `packages/api/.env` from the main checkout (or recreate it from the Environment section). Say that worktrees share ports 3000, 5173 and 5432, so only one dev stack runs at a time.
- **Adding a dependency:** the exact `pnpm add` command for a workspace package, and that `pnpm-lock.yaml` is committed with it. Link [no assumptions](../../../docs/workflow/no-assumptions.md) for when a dependency may be added; do not restate it.
- **Running the browser check:** the testing policy requires one for visible changes but nothing says how. Document: `pnpm db:up`, `pnpm db:migrate`, `pnpm dev:api`, `pnpm dev:web`, then open http://localhost:5173 with the Chrome DevTools MCP. This runs the real API in dev mode, nothing is mocked. Name the seeded Users (link `seed.ts`).

**Allowed packages:** None

**Blocked by:** None

**Status:** resolved

- [x] `setup.md` has a worktree section, a dependency section and a browser-check section with the contents above
- [x] Every command and script name was checked against the root and package `package.json` files
- [x] `setup.md` stays a Descriptive Doc and no rule from another doc is restated; each mention links the doc that owns it
- [x] Every link resolves; `pnpm lint` passes; `pnpm docs:generate` leaves no diff

**Verification:** Run the browser-check commands once if Docker is available and say in the Ticket's `## Comments` whether you did. Otherwise say which you only read.

**Out of scope:** Whether agents should use a worktree by default (ticket 02). CI. Changing any script.

## Comments

Resolved. `docs/workflow/setup.md` gains three sections: A second worktree, Adding a dependency, Browser check. Rules are linked, not restated ([no assumptions](../../../docs/workflow/no-assumptions.md), [testing policy](../../../docs/workflow/testing-policy.md)).

Verification, all run (none only read): Docker was up and ports 3000/5173/5432 were free, so in this worktree I ran the copy of `packages/api/.env` from the main checkout, `pnpm db:up`, `pnpm build:contracts`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev:api`, `pnpm dev:web`, then opened http://localhost:5173 with the Chrome DevTools MCP and logged in as `alice` / `password123`; the seeded Conversations showed. Then I stopped both dev servers and ran `pnpm db:down`. `pnpm lint`, `pnpm typecheck` and `pnpm test` pass; `pnpm docs:generate` leaves no diff. Every script name was checked against the root and package `package.json` files.

Assumptions:

- The browser-check block adds `pnpm build:contracts` and `pnpm db:seed`, which the Ticket's list leaves out: `db:migrate` needs the built contracts, and the seeded Users exist only after `db:seed`.
- The worktree section adds a gotcha found during the run: Docker Compose names the project after the folder, so each worktree's `db:up` gets its own `pgdata` volume and needs migrating and seeding again.
