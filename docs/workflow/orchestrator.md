---
kind: intent
---

# Orchestrator

How the Orchestrator runs a Spec with `implement-spec` at the lowest token cost. Where this differs from the skill, this page wins. Only the Orchestrator reads it: every sub-agent gets what it needs through its hand-off.

## Before spawning

- Build the task graph with `grep` on each Ticket's `**Blocked by:**` and `**Status:**` lines. Read a whole Ticket only when writing its brief.
- Check that Docker is running.
- If a Ticket may change a dependency (for example `shadcn add`) and its Allowed packages don't cover it, ask the human first.
- Run Tickets one at a time when both change the schema (they would take the same migration number) or both need a browser check (they would share ports). Everything else on the frontier may run at once.

## Choosing the model

Decide when writing the brief, record it there with a one-line reason, and pass `model` when spawning.

- **Default: Sonnet.**
- **Opus** when the Ticket designs something new, not when it follows an existing pattern:
  - a migration with a backfill or a change to existing data;
  - a locking, multi-step transaction or realtime ordering mechanism;
  - an auth, session or permission mechanism;
  - a design decision the Ticket and Spec leave open.
- Package count, line count and Ticket length are not signals. Most Tickets touch several packages, so they would send nearly everything to Opus.
- If a Sonnet run gets stuck or keeps failing, run it again on Opus and say why in the handoff note.
- No Haiku until there are numbers to support it.
- Other Roles: Reviewer on Opus; Explorer and an Implementer fixing review findings on Sonnet, unless a finding hits an Opus signal.

## Hand-off

The spawn prompt is the absolute path of the brief and one sentence. The brief points at documents instead of copying them. It states directly only what a sub-agent can't find itself: new decisions and the current state of the Feature Branch.

### Implementer brief

Write it to the scratchpad, about 25 lines:

```markdown
Ticket: <path>
Feature Branch: <name>, tip <sha>
Task Branch: agent/<NNNNN>-<NN>-<slug> (create it first; the read scope is keyed on it)
Spec sections: <headings> (grep -n '^#' the spec, read only these)
Packages: <api, web, contracts>
Commands: <the package test command, then the full checks once before the PR>
Browser check: yes | no
Model: sonnet | opus, because <reason>
Latest migration: <number, if the Ticket changes the schema>
Decisions since the Ticket was written: <human answers, packages allowed, or None>
Handoff notes to read: <absolute paths, only Tickets in Blocked by, or None>
Notes folder: <absolute path>

Rules:

- Read only what this brief names. A link in a doc is not an instruction to read it: follow it only when the condition beside it holds, or when stuck.
- Stop when the PR is open. Do not merge. When stuck, follow docs/workflow/escalation.md.
- Commit work in progress and update your note at each milestone.
- Handoff note, at most 15 lines: new helpers or seams with paths, migration number, gotchas, what is unfinished. Do not retell the work.
- Final report, at most 10 lines: PR, check results, anything to decide.
```

### Other Roles

- **Reviewer**: the diff range, the Spec path and that the scope is the whole Feature Branch. It returns findings with `file:line`.
- **Implementer fixing findings**: the approved findings. It does not re-read the Tickets.
- **Explorer**: one specific question and the path of the note to write.

### Resume or respawn

An agent blocked on a question continues through `SendMessage` with the answer, because it still has its context. Spawn a new one only when the agent was stopped and can't resume. The new one reads the note and `git log` and continues from the work in progress, without re-reading the docs.

## Read scope

Before spawning, write the docs the Implementer may read whole to `<git-common-dir>/read-scope/<task-branch>.txt`, one glob per line: the `AGENTS.md` and conventions of each package it touches, plus [browser-check](browser-check.md) and [worktree](worktree.md) if it needs them. Handoff notes sit outside the repo and need no entry. Delete the file when cleaning up the worktree.

[guard-reads.ts](../../scripts/hooks/guard-reads.ts) enforces it and always allows the Ticket and the docs every PR needs. The Spec is left out on purpose, so the Implementer reads only the named sections. A PR body that reports a read outside the scope means the scope or the brief was missing something: fix it for the next Ticket.

## Merging

The Orchestrator merges task PRs itself and spawns no merger sub-agent:

1. Read the PR.
2. Check the conditions in the [git workflow](git-workflow.md#rules).
3. Squash-merge, pinned to the head SHA.
4. Delete the Task Branch.

On a conflict or a missing Feature Branch tip, send the PR back to its Implementer. The Orchestrator writes no product code.

## Keeping the main session small

Don't re-read what a brief already holds. When the context has grown large between Tickets, remind the human to run `/compact`, which an agent can't do itself.
