---
kind: intent
---

# Ticket template

Every new Ticket has these fields, in this order. Where Tickets live and how they are numbered is in [issue tracker](../agents/issue-tracker.md).

```markdown
# NN: Title

**What to build:** ...

**Allowed packages:** None

**Blocked by:** None

**Status:** needs-triage

- [ ] ...

**Verification:** ...

**Out of scope:** None

## Comments
```

## Fields

- **Title**: the Ticket's two-digit number and a short name.
- **What to build**: the change and the workspace packages (api, web, contracts, scripts) it touches.
- **Allowed packages**: npm dependency changes this Ticket may make, each with its version (for example `add zod-to-json-schema@^3`). `None` by default. See [no assumptions](no-assumptions.md).
- **Blocked by**: the numbers of the Tickets that must be `resolved` first (`NN, NN`), or `None`.
- **Status**: one of the five labels in [triage labels](../agents/triage-labels.md), or `resolved`.
- **Acceptance criteria**: one checkbox per result someone can check (a behaviour, a file, a command that passes), never a step in how to build it.
- **Verification**: only checks specific to this Ticket: which tests to add, `pnpm docs:generate` when the schema, routes or realtime events change, a browser check, a manual command. The checks every PR runs are in the [definition of done](definition-of-done.md).
- **Out of scope**: things a reader might reasonably expect but that this Ticket does not do, or `None`.
- **Comments**: questions, answers and the closing summary, appended over time. See [escalation](escalation.md).

## Existing and skill-written Tickets

- Tickets written before this template stay as they are. [12-fix-stale-throttling-comments.md](../../.scratch/00004-agent-docs-foundation/issues/12-fix-stale-throttling-comments.md) shows the style of the older fields.
- When a skill (to-tickets, Wayfinder) writes a Ticket that is missing fields, the writer adds them before setting it `ready-for-agent` or `ready-for-human`.
