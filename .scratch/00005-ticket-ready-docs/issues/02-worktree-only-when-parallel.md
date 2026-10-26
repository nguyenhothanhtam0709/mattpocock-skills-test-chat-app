# 02: A worktree is for parallel Implementers only

**What to build:** `docs/factory/agent-roles.md` gives the Implementer "its own worktree" as the default. With one human and one session at a time, a worktree only costs setup (`.env`, `node_modules`) and clashes on ports 3000, 5173 and 5432 when two dev stacks run. Change the Implementer row to say a separate worktree is used when several Implementers run at once, and otherwise the main checkout, linking the worktree steps in [setup](../../../docs/workflow/setup.md) instead of describing them. `git grep -i worktree docs packages/*/AGENTS.md AGENTS.md` first: change every doc that says the same thing, so the rule has one home. This Ticket is the human's decision, so start with a grilling session to confirm the default before writing it.

**Allowed packages:** None

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The human confirmed the default in a grilling session, recorded under `## Comments`
- [ ] `agent-roles.md` states the default once; any other doc that said it links there
- [ ] The root `AGENTS.md` and skill-generated files are unchanged
- [ ] Every link resolves; `pnpm lint` passes

**Verification:** `git grep -i worktree` shows no doc still giving the old default.

**Out of scope:** Building the dispatcher or automating worktree creation (the spec leaves the pipeline to a later MVP).

## Comments
