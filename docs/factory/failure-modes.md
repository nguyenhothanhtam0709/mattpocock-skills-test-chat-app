---
kind: intent
---

# Failure modes

What goes wrong in the Factory and who acts. The Roles are in [agent roles](agent-roles.md). Escalation always follows [escalation](../workflow/escalation.md).

- **Red checks**: there is no CI yet, so this means a failing local check. The Implementer fixes it inside the Ticket. A failure from outside the Ticket, or a flaky test, is an Escalation. _Not enforced yet:_ CI, see [Laters](../laters.md#enforce-the-doc-and-convention-rules).
- **Stuck agent**: the agent escalates. When an Implementer reaches its stop condition without a PR, the Orchestrator stops it and reports to the human. It never retries blind.
- **Conflicting Tickets**: a textual conflict is resolved by the Implementer when it merges the Feature Branch tip in, or by the Merger. A semantic conflict (two Tickets want contradicting things) is an Escalation on the later Ticket, and the human edits the Tickets.
- **Wrong Spec**: stop and set `needs-info` on each affected Ticket. The human fixes the Spec through a PR to `main`, then `main` is merged into the Feature Branch ([git workflow](../workflow/git-workflow.md)).
- **Doc and code disagree**: follow the precedence in [ADR 0008](../adr/0008-documents-are-classed-by-how-they-are-maintained.md). Code that contradicts an Intent Doc is the defect; fixing it outside the Ticket is an Escalation.
- **Denied permission prompt**: an Escalation. Never work around it through the shell.
- **Scope creep found in review**: revert the change and append it to [Laters](../laters.md) ([no assumptions](../workflow/no-assumptions.md)).
