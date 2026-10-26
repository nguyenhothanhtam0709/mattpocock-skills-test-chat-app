# 09: Workflow docs

**What to build:** The per-Ticket rules in `docs/workflow/`. Intent Docs, each from a grilling session with the human: the definition of done (one checklist every PR passes); the ticket template (what to build, allowed packages, blocked by, status, acceptance criteria, verification including `pnpm docs:generate` where relevant, out of scope); escalation (when stuck: set `needs-info`, write the question under `## Comments`, stop); the testing policy (which kinds of test a change needs). A Descriptive Doc drafted by an agent: setup (from a clean checkout to green tests: Docker, database up, migrate, seed, and which tests need what). Each has `kind` front matter. Link the new docs from the root `AGENTS.md` below the `## Agent skills` block.

**Blocked by:** 05

**Status:** resolved

- [x] Definition of done, ticket template, escalation and testing policy each approved in a grilling session
- [x] Setup is verified by following it from a clean checkout to passing `pnpm test`
- [x] Root `AGENTS.md` stays at or under about 40 lines and the `## Agent skills` block is unchanged
- [x] Every link resolves; `pnpm lint` passes

## Comments

Human approved the testing policy, definition of done, ticket template and escalation in a grilling session. Decisions beyond the ticket text: the testing policy owns the mocking rule (behaviour tests: no mocks of our own code without human approval; unit tests may mock collaborators through existing seams) and `docs/conventions/general.md` now links to it; "Allowed packages" means npm dependency changes only. Setup was drafted by an agent and verified from a fresh clone: `pnpm install`, `.env`, `db:up`, `build:contracts`, `db:migrate`, `db:seed`, then `pnpm test` green (contracts 142, api 261, web 124, scripts), plus `pnpm lint`, `typecheck` and `docs:generate` with no diff. Agent reviewed: every link resolves, `kind` front matter on all five, root `AGENTS.md` is 39 lines with `## Agent skills` unchanged, `pnpm lint` passes. Found while verifying: the README's setup steps also miss `pnpm build:contracts` before `db:migrate`; left for ticket 11 (README).
