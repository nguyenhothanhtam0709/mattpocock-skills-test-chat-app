# Docs enhancement (input for a grilling session)

Notes from a review of the docs, to be stress-tested with `grilling` before anything becomes a Spec. Nothing here is decided. Word counts are from the review day and will drift.

## Context

- About 10,600 words of hand-maintained docs in 34 files, next to about 20,000 lines of TypeScript. ADRs (about 1,750 words) are historical records and cost almost nothing to maintain, so they are left out of that count.
- Only the root `AGENTS.md` (about 300 words) is loaded into every session. Everything else is a link the agent follows or skips on its own.
- The concern that started this: is this too much documentation for an AI-native SDLC? The repo is also a place to practise the workflow, so the Factory docs may be the point of the exercise, not a cost.

## Observations to verify

1. **One rule lives in several files.** Changing one means editing all of them.
   - The Merger exists only when the human allows it: `factory/overview.md` (Stage 9), `factory/gates.md`, `factory/agent-roles.md`.
   - The "Not enforced yet: pre-approved GitHub merge permission" note is copied in `gates.md` and `agent-roles.md`, with a variant in `failure-modes.md`.
   - Who may change a Ticket's Status: `factory/ticket-lifecycle.md`, `factory/overview.md` (Stage 4), `workflow/escalation.md`, `workflow/definition-of-done.md`.
   - "A flaky test is escalated, never retried": `escalation.md`, `testing-policy.md`, `failure-modes.md`.
   - "No new package, no scope creep": `no-assumptions.md`, `escalation.md`, `definition-of-done.md`.
2. **Skill names in the docs may be stale.** The docs name `grill-with-docs`, `to-spec`, `to-tickets`, `implement-spec`, `triage` and `retro`. They were not in the skill list of the review session (it showed `grilling`, `domain-modeling`, `tdd`, `code-review` and others) and are not under `.agents/skills`. Not confirmed: they may come from another plugin or version.
3. **Nothing catches drift automatically.** ADR 0008 rejected a periodic drift audit, and the CI, link-check and `covers:` ideas are still in `laters.md`. Today only "update the doc in the same PR" keeps docs honest.
4. **`runtime-flows.md` (about 950 words) is a Descriptive Doc** that an agent could mostly rebuild from the code. Its value may only be the invariants the code does not show.
5. **Load-bearing gates are only links.** The definition of done and the testing policy decide whether a PR is good, but nothing makes an agent read them.

## Questions for the grilling

- Is the Factory (11 Stages, 7 Roles, gates, failure modes) a real process or a design exercise? Does it matter that there is one human and one Claude session today?
- Which single file should own each repeated rule in observation 1, and should the others only link to it?
- Do the "Not enforced yet" notes belong in the intent docs at all, or only in `laters.md`?
- Should the skill names be checked against what is installed, and who owns that check: a script, a review step, or the Reviewer role?
- Is a drift check worth building now (links, front matter, skill names), given ADR 0008 deferred the audit? What would change that decision?
- Should the definition of done and the testing policy be summarised in the root `AGENTS.md`, so the agent cannot skip them?
- Which Descriptive Docs should become Generated Docs (the ER diagram is the obvious one), and which should be deleted?
- What would "too many docs" look like here as a measurable signal: a doc the agent never reads, two docs that disagree, a PR that needs more than N doc edits?

## Not in scope

- `laters.md` and `.scratch/` are the user's own notes and the skills' history. They are not docs for the agent.
- Cutting content for token cost: the docs are not loaded eagerly, so token cost is small.
