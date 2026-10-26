---
kind: intent
---

# Gates

What must be true before work leaves a Stage. The Stages are in the [overview](overview.md).

## Gates by Stage

- **Spec → Tickets**: the human has merged the Spec PR to `main`.
- **Tickets → Implement**: the human has merged the Ticket PR. Each Ticket is `ready-for-agent` or `ready-for-human`, with every [ticket template](../workflow/ticket-template.md) field filled.
- **Implement starts**: the Ticket is `ready-for-agent` (or `ready-for-human`, for the human), every Ticket in its `Blocked by` is `resolved`, and the Feature Branch is up to date with `main`.
- **Task PR → merge**: the [definition of done](../workflow/definition-of-done.md) is ticked, machine checks included, the Reviewer has run, and the human approves.
- **Feature Branch → `main`**: every Ticket is `resolved`, the Spec is `resolved`, `code-review` has run on the whole Feature Branch and its findings are fixed, and the human merges with a merge commit.

_Not enforced yet:_ CI, branch protection and a required human approval. Today the agent runs the checks itself and the human checks the PR. See [Laters](../laters.md#enforce-the-doc-and-convention-rules).

## Where the human must approve

- Merging a Spec PR or a Ticket PR to `main`.
- Triage: setting a Ticket's Status from `needs-triage`.
- Answering a `needs-info` Ticket and setting it back to ready ([escalation](../workflow/escalation.md)).
- Every task PR merge, unless the human explicitly allowed the Merger ([agent roles](agent-roles.md#the-merger)).
- Merging the feature PR to `main`.

_Not enforced yet:_ the agent's GitHub merge permission is still pre-approved in the local Claude Code settings. See [Laters](../laters.md#enforce-the-doc-and-convention-rules).
