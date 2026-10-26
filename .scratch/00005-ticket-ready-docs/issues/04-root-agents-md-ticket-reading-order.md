# 04: The root AGENTS.md gives the order to read when doing a Ticket

**What to build:** The root `AGENTS.md` has a `## Workflow` section that lists the per-Ticket docs in one sentence, in no order. A cold-start agent found the right docs, but only by following every link. Rewrite that section (below the `## Agent skills` block, never inside it) as a short ordered list: the Ticket, the package `AGENTS.md`, the git workflow, the testing policy, then the definition of done (opening the PR and checks) and escalation. Names and links only, no rule restated (spec story 3). Do not add a second section; replace the sentence. The whole root `AGENTS.md` prompts the human before an edit: wait for the answer, and never write it through the shell.

**Allowed packages:** None

**Blocked by:** 01, 03

**Status:** resolved

- [x] The `## Agent skills` block is unchanged
- [x] `## Workflow` lists the reading order once, each item a link, and the root file stays short
- [x] The human approved the edit at the prompt, recorded under `## Comments`
- [x] Every link resolves; `pnpm lint` passes

**Verification:** Re-run the cold-start dry run on `.scratch/00003-client-side-router/issues/01-adopt-react-router.md` (read only, plan only) and say in `## Comments` whether the agent now reads the definition of done and the testing policy without being told.

**Out of scope:** Any change to the package `AGENTS.md` files. Enforcing that the agent reads them (CI, hooks; in `docs/laters.md`).

## Comments

- 2026-10-27: The human approved the root `AGENTS.md` edit at the permission prompt and confirmed it in the session. The edit was made with the Edit tool, never through the shell.
- 2026-10-27: Cold-start dry run (read only, plan only) on `.scratch/00003-client-side-router/issues/01-adopt-react-router.md`, given only the root `AGENTS.md`. Without being told, the agent read the Ticket, the ticket template, `packages/web/AGENTS.md`, the git workflow, the testing policy, setup, the definition of done and escalation, in that order. Its plan opened the PR with the GitHub MCP tools and the `pr` skill, and left an unrunnable check unticked with the PR in draft. It also noticed the Ticket is already resolved and said it would ask the human rather than redo it.
- 2026-10-27: Closing summary. `## Workflow` is now an ordered reading list of six links; the `## Agent skills` block is unchanged. Verified: every link resolves, `pnpm lint` passes, `pnpm docs:generate` leaves no diff, and the dry run above. No follow-ups.
