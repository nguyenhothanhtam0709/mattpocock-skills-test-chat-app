# 10: Factory docs

**What to build:** Intent Docs in `docs/factory/` describing the software factory, each from a grilling session with the human: the overview (stages from idea to merge and learning, who owns each: human, agent or machine); the Ticket lifecycle (the `Status` state machine and who may move a Ticket between states); agent roles (inputs, outputs, allowed tools and skills, stop conditions); gates (what each stage must pass, where a human must approve); failure modes (red CI, a stuck agent, conflicting Tickets, a wrong spec). Use Factory glossary terms and add new ones through the domain-modeling skill. Each has `kind: intent` front matter.

**Blocked by:** 04

**Status:** resolved

- [x] Five docs, each approved in a grilling session
- [x] Enforcement that is not built yet is marked as such and points to the `docs/laters.md` entry
- [x] No Chat terms used for process concepts
- [x] Every link resolves; `pnpm lint` passes

## Comments

Human approved all five docs in a grilling session (two rounds). Decisions beyond the ticket text: the docs describe the Factory as it runs today and mark unbuilt enforcement _Not enforced yet_ with a link to the laters entry; they link to `docs/workflow/` instead of restating per-Ticket rules; "Actor" replaces "owner" for who does a Stage (Owner is a Chat term); no "in progress" Status, a Task Branch or draft PR marks a taken Ticket; the Merger Role exists only when the human explicitly allows it for that Spec; the lifecycle doc also covers Spec status. New Factory glossary terms: Spec, Stage, Actor, Gate, Agent Role, Feature Branch, Task Branch, Escalation. The root `AGENTS.md` gained one line under `## Workflow` linking the overview (approved at the prompt; now 41 lines, `## Agent skills` unchanged). Agent reviewed: every link and anchor resolves, `kind: intent` on all five, `pnpm lint` passes.
