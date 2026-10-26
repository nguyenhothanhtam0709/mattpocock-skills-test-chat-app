# 19: The merge checks live in one doc

**What to build:** The spec says each rule lives in exactly one doc. The second code review found two rules written out in several places:

- "Run `pnpm docs:generate` (and commit it) when the schema, routes or realtime events change": `docs/workflow/definition-of-done.md`, `docs/workflow/ticket-template.md`, `packages/api/AGENTS.md`, `packages/contracts/AGENTS.md` and `docs/factory/gates.md`.
- The machine checks before merge (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm docs:generate` with no diff): `docs/workflow/definition-of-done.md`, `docs/factory/gates.md` and `docs/factory/overview.md`.

Keep each rule in the definition of done. Other docs name it in a few words and link it. The package `AGENTS.md` files keep a short `pnpm docs:generate` command line (ticket 06 asks for it), linking the definition of done for the rule. The definition-of-done checklist is a fenced block copied into PR bodies, so it stays self-contained.

**Allowed packages:** None

**Blocked by:** None

**Status:** ready-for-agent

- [ ] Neither rule is explained outside the definition of done; every other mention links it
- [ ] The package `AGENTS.md` files still name `pnpm docs:generate` and stay at or under about 40 lines
- [ ] The root `AGENTS.md` and skill-generated files are unchanged
- [ ] Every link resolves; `pnpm lint` passes

**Verification:** None beyond the definition of done.

**Out of scope:** Other rules.

## Comments
