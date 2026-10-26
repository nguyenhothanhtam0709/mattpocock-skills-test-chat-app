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
- [ ] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass locally on the final commit.
- [ ] Docs affected by the change are updated in this PR; `pnpm docs:generate` was run and committed if the schema, routes or realtime events changed.
- [ ] Migrations follow ADR 0003 (never hand-edited).
- [ ] Nothing outside the Ticket changed; anything noticed is appended to `docs/laters.md` or raised.
- [ ] Every assumption is listed in the PR body and under the Ticket's `## Comments`.
- [ ] The latest feature branch is merged in; the PR targets the feature branch, links the Ticket and says how the change was verified (including the browser check when the testing policy requires one).
```

## Where each rule lives

[Ticket template](ticket-template.md) (Allowed packages, acceptance criteria), [testing policy](testing-policy.md), [ADR 0003](../adr/0003-drizzle-schema-is-source-of-truth.md) (migrations), [no assumptions](no-assumptions.md) (scope, assumptions), [git workflow](git-workflow.md) (branches, PRs), [laters](../laters.md).
