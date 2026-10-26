# 05: An agent may merge a task PR into its feature branch

**What to build:** `docs/workflow/git-workflow.md` lets an agent merge a task PR into its feature branch only "when the human has explicitly allowed it", so every run of `implement-spec` stops to ask. Make it a standing permission. An agent may squash-merge a task PR (`agent/<NNNNN>-<NN>-<ticket-slug>`) into its feature branch, and delete the task branch, when the PR is not a draft (every [definition of done](../../../docs/workflow/definition-of-done.md) item is ticked) and the latest feature branch is merged into it. An agent still never merges a spec PR or a feature PR into `main`. Change the rule under `## Rules` and step 7 of "Implementing a Ticket" to match. Docs only; touches `docs/workflow/git-workflow.md` and nothing else. The file is skill-generated: the edit prompts the human, so wait for the answer and never write it through the shell.

**Allowed packages:** None

**Blocked by:** None

**Status:** ready-for-agent

- [ ] `git-workflow.md` gives an agent standing permission to squash-merge a task PR into its feature branch, with the two conditions above
- [ ] It still forbids an agent from merging a spec PR or a feature PR into `main`
- [ ] The `## Rules` list and step 7 of "Implementing a Ticket" agree
- [ ] No other file changed
- [ ] Every link resolves; `pnpm lint` passes

**Verification:** None beyond the definition of done.

**Out of scope:** A note in `docs/laters.md` that re-running the setup skill may undo this (the human declined it). Auto-merge, CI or branch protection.

## Comments

- 2026-10-27: The human confirmed the conditions and asked for this change, as a Ticket in spec 00005, in the session that implements the spec. They declined a `docs/laters.md` note about the setup skill regenerating the file.
