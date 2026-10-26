---
kind: intent
---

# Definition of done

Every PR passes this one checklist.

## How to use it

- Copy the checklist into the PR body and tick each item. An item that doesn't apply is ticked with "n/a" and a reason, never deleted.
- The agent ticks the checklist; the human reviewer checks it. A PR with any unticked item stays in draft.
- The last commit of the PR closes the Ticket: set `**Status:** resolved` and add a short summary under `## Comments` (what was verified, follow-ups created). Example: [05-coding-conventions.md](../../.scratch/00004-agent-docs-foundation/issues/05-coding-conventions.md).

## Checklist

```markdown
- [ ] Every acceptance criterion in the Ticket is met and ticked in the Ticket file.
- [ ] No dependency changed beyond the Ticket's Allowed packages.
- [ ] Tests follow the testing policy: the right kind, written first, nothing weakened without approval.
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass locally on the final commit, and `pnpm docs:generate` leaves no diff.
- [ ] Docs affected by the change are updated in this PR; `pnpm docs:generate` was run and committed if the schema, routes or realtime events changed.
- [ ] Migrations follow ADR 0003 (never hand-edited).
- [ ] Nothing outside the Ticket changed; anything noticed is appended to `docs/laters.md` or raised.
- [ ] Every assumption is listed in the PR body and under the Ticket's `## Comments`.
- [ ] The latest feature branch is merged in; the PR targets the feature branch, links the Ticket and says how the change was verified (including the browser check when the testing policy requires one).
```

## Opening the PR

- Open and update the PR with the GitHub MCP tools: `mcp__github__create_pull_request` to open it, `mcp__github__update_pull_request` to mark it ready. Not `gh`, which may not be logged in.
- Write the body with the `pr` skill, with the checklist above copied in verbatim.
- Open it as a draft only when an item is unticked. Otherwise open it ready for review.

## A check you cannot run

A check cannot run when something it needs is missing from the environment, such as Docker for the API tests in `pnpm test` ([setup](setup.md)). A check that runs and fails never counts: fix it or [escalate](escalation.md).

- Leave its item unticked, and under it in the PR body say which check did not run and why. The PR stays in draft.
- Add one line saying the same to the Ticket's closing summary under `## Comments`.

## Where each rule lives

[Ticket template](ticket-template.md) (Allowed packages, acceptance criteria), [testing policy](testing-policy.md), [ADR 0003](../adr/0003-drizzle-schema-is-source-of-truth.md) (migrations), [no assumptions](no-assumptions.md) (scope, assumptions), [git workflow](git-workflow.md) (branches, PRs), [laters](../laters.md).
