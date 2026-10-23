# 09: Workflow docs

**What to build:** The per-Ticket rules in `docs/workflow/`. Intent Docs, each from a grilling session with the human: the definition of done (one checklist every PR passes); the ticket template (what to build, allowed packages, blocked by, status, acceptance criteria, verification including `pnpm docs:generate` where relevant, out of scope); escalation (when stuck: set `needs-info`, write the question under `## Comments`, stop); the testing policy (which kinds of test a change needs). A Descriptive Doc drafted by an agent: setup (from a clean checkout to green tests: Docker, database up, migrate, seed, and which tests need what). Each has `kind` front matter. Link the new docs from the root `AGENTS.md` below the `## Agent skills` block.

**Blocked by:** 05

**Status:** ready-for-human

- [ ] Definition of done, ticket template, escalation and testing policy each approved in a grilling session
- [ ] Setup is verified by following it from a clean checkout to passing `pnpm test`
- [ ] Root `AGENTS.md` stays at or under about 40 lines and the `## Agent skills` block is unchanged
- [ ] Every link resolves; `pnpm lint` passes

## Comments
