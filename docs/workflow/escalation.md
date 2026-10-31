---
kind: intent
---

# Escalation

What to do when stuck on a Ticket: ask, then stop. Never guess.

## When to escalate

- A question the Ticket, spec, ADRs and code don't settle.
- A dependency change the Ticket's Allowed packages don't cover.
- A fix that would widen the scope ([no assumptions](no-assumptions.md)), including code that contradicts an Intent Doc when fixing it falls outside the Ticket. [ADR 0008](../adr/0008-documents-are-classed-by-how-they-are-maintained.md) says which side is the defect.
- An exception to the [testing policy](testing-policy.md): a mock in a behaviour test, or a weakened or deleted test.
- A flaky test ([testing policy](testing-policy.md#changing-existing-tests)).
- Two Tickets that want contradicting things: escalate on the later Ticket, and the human edits the Tickets.
- Failures that come from outside the Ticket.
- A Ticket this one is blocked by that is not `resolved`.
- A denied prompt to edit a skill-generated file.

## How to escalate

1. Set `**Status:** needs-info` in the Ticket file.
2. Under `## Comments`, write what you tried, the question, the options with your recommendation, and what is blocked.
3. Commit the Ticket file with any work in progress on the Task Branch, and push it.
4. Open a draft PR to the Feature Branch, or update the existing one, with the question in the body ([opening the PR](definition-of-done.md#opening-the-pr)).
5. Stop.

Stop means no further work on that Ticket and no proceeding on a guess. Other unblocked Tickets may continue.

## A wrong Spec

Stop and set `needs-info` on each affected Ticket. The human fixes the Spec through a PR to `main`, then `main` is merged into the Feature Branch.

## A stuck Implementer

When an Implementer reaches its stop condition without a PR, the Orchestrator stops it and reports to the human. It never retries blind.

## Resuming

- The human answers under `## Comments` and sets the status back to `ready-for-agent` or `ready-for-human`.
- The agent that resumes re-reads the whole `## Comments` section before continuing.

## Guessing

Proceed on a guess only when the human has said to proceed for that Ticket. Then list each guess as [no assumptions](no-assumptions.md) requires.
