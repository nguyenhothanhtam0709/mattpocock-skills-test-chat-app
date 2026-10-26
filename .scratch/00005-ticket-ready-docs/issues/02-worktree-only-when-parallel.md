# 02: A worktree is for parallel Implementers only

**What to build:** `docs/factory/agent-roles.md` gives the Implementer "its own worktree" as the default. With one human and one session at a time, a worktree only costs setup (`.env`, `node_modules`) and clashes on ports 3000, 5173 and 5432 when two dev stacks run. Change the Implementer row to say a separate worktree is used when several Implementers run at once, and otherwise the main checkout, linking the worktree steps in [setup](../../../docs/workflow/setup.md) instead of describing them. `git grep -i worktree docs packages/*/AGENTS.md AGENTS.md` first: change every doc that says the same thing, so the rule has one home. This Ticket is the human's decision, so start with a grilling session to confirm the default before writing it.

**Allowed packages:** None

**Blocked by:** 01

**Status:** resolved

- [x] The human confirmed the default in a grilling session, recorded under `## Comments`
- [x] `agent-roles.md` states the default once; any other doc that said it links there
- [x] The root `AGENTS.md` and skill-generated files are unchanged
- [x] Every link resolves; `pnpm lint` passes

**Verification:** `git grep -i worktree` shows no doc still giving the old default.

**Out of scope:** Building the dispatcher or automating worktree creation (the spec leaves the pipeline to a later MVP).

## Comments

Grilling session, 2026-10-27. The human confirmed:

1. Default: an Implementer uses a separate worktree only when several Implementers run at once; otherwise the main checkout.
2. The Orchestrator decides at dispatch time: two or more Implementers running at the same moment (e.g. an `implement-spec` frontier of 2+) → each gets a worktree. A single Implementer, alone in the session → the main checkout.
3. Only the Implementer row in `docs/factory/agent-roles.md` changes; no worktree rule is written for the Merger or Reviewer.
4. State it once in that row; link `../workflow/setup.md#a-second-worktree` for the steps, restating nothing.

Resolved. The Implementer row in [agent-roles.md](../../../docs/factory/agent-roles.md) now says it works in the main checkout, or in a separate worktree (linked to [setup](../../../docs/workflow/setup.md#a-second-worktree)) when the Orchestrator runs two or more Implementers at once. Prettier realigned the table's columns; no other row's text changed.

Verification: `git grep -i worktree docs packages/*/AGENTS.md AGENTS.md` before the change found the old default only at `docs/factory/agent-roles.md:15`. After it, the only hits are that row and the steps in `docs/workflow/setup.md`, which give no default, so no other doc needed a link. The `#a-second-worktree` anchor matches the `## A second worktree` heading. `pnpm lint`, `pnpm typecheck` and `pnpm test` pass; `pnpm docs:generate` leaves no diff. The root `AGENTS.md` and skill-generated files are unchanged.

Assumptions: none beyond the grilling answers.
