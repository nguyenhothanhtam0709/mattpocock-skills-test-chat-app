# 03: The definition of done says how to open the PR and what to do when a check cannot run

**What to build:** The same dry run found two things `docs/workflow/definition-of-done.md` does not say. Add them there, once. Other docs link them.

- **Opening the PR:** which tool and how. `gh` may not be logged in; the GitHub MCP tools work. Name them and the `pr` skill for writing the body, and say the checklist is copied into the body (the doc already says so). The human confirms the tool choice in a grilling session.
- **A check that cannot run here:** `pnpm test` includes the API tests, which need Docker (`docs/workflow/setup.md`). An earlier Ticket skipped them with no rule allowing it. Say what to do: do not tick the item, say in the PR body which check did not run and why, and leave the PR in draft, which the doc already requires for any unticked item. Do not write a new exception.

The checklist is a fenced block copied into PR bodies, so keep it self-contained; add the new text outside it if possible.

**Allowed packages:** None

**Blocked by:** None

**Status:** resolved

- [x] The definition of done has a short "Opening the PR" part and a short "A check you cannot run" part
- [x] Neither rule is stated in any other doc; any mention links the definition of done
- [x] The human confirmed the tool choice in a grilling session, recorded under `## Comments`
- [x] The root `AGENTS.md` and skill-generated files are unchanged
- [x] Every link resolves; `pnpm lint` passes

**Verification:** None beyond the definition of done.

**Out of scope:** CI, branch protection or authenticating `gh` (all in `docs/laters.md`). Editing the PR flow in `git-workflow.md`, which is skill-generated.

## Comments

**2026-10-27, grilling session (confirmed by the human):**

1. Opening the PR: always the GitHub MCP tools (`mcp__github__create_pull_request`; `mcp__github__update_pull_request` to mark it ready). Not `gh`, which may not be logged in (authenticating it is in `docs/laters.md`).
2. PR body: written with the `pr` skill; the definition-of-done checklist is copied in verbatim.
3. Open as a draft only when a checklist item is unticked; otherwise open it ready for review.
4. "A check you cannot run" means something the check needs is missing from the environment (e.g. Docker for the API tests). A check that runs and fails never counts: fix it or escalate (`docs/workflow/escalation.md`).
5. Record it in both places: in the PR body under the unticked item (which check, why), with the PR left in draft; and one line in the Ticket's closing summary under `## Comments`.

**2026-10-27, closing summary:** Added "Opening the PR" and "A check you cannot run" to `docs/workflow/definition-of-done.md`, outside the checklist block, from the grilling answers above. `git grep` found one other doc on opening a PR, `docs/workflow/escalation.md` (step 4, draft PR); it now links the definition of done instead of naming a tool. No other doc states either rule; `git-workflow.md` was left alone (skill-generated, Ticket 05 edits it). Verified: links resolve, `pnpm lint`, `pnpm typecheck` and `pnpm test` (Docker available) pass, `pnpm docs:generate` leaves no diff. No checks skipped. No follow-ups.
