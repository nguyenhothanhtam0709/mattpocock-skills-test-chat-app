# 03: The definition of done says how to open the PR and what to do when a check cannot run

**What to build:** The same dry run found two things `docs/workflow/definition-of-done.md` does not say. Add them there, once. Other docs link them.

- **Opening the PR:** which tool and how. `gh` may not be logged in; the GitHub MCP tools work. Name them and the `pr` skill for writing the body, and say the checklist is copied into the body (the doc already says so). The human confirms the tool choice in a grilling session.
- **A check that cannot run here:** `pnpm test` includes the API tests, which need Docker (`docs/workflow/setup.md`). An earlier Ticket skipped them with no rule allowing it. Say what to do: do not tick the item, say in the PR body which check did not run and why, and leave the PR in draft, which the doc already requires for any unticked item. Do not write a new exception.

The checklist is a fenced block copied into PR bodies, so keep it self-contained; add the new text outside it if possible.

**Allowed packages:** None

**Blocked by:** None

**Status:** ready-for-agent

- [ ] The definition of done has a short "Opening the PR" part and a short "A check you cannot run" part
- [ ] Neither rule is stated in any other doc; any mention links the definition of done
- [ ] The human confirmed the tool choice in a grilling session, recorded under `## Comments`
- [ ] The root `AGENTS.md` and skill-generated files are unchanged
- [ ] Every link resolves; `pnpm lint` passes

**Verification:** None beyond the definition of done.

**Out of scope:** CI, branch protection or authenticating `gh` (all in `docs/laters.md`). Editing the PR flow in `git-workflow.md`, which is skill-generated.

## Comments
