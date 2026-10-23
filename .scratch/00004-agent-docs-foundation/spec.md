# Spec: Agent docs foundation

Status: ready-for-agent

## Problem Statement

We want an AI-native SDLC: a software factory where agents turn Tickets into PRs with little hand-holding. Agents only know what is written down, and today much of what they need is not. There is no architecture map, no coding conventions, no testing policy, no definition of done and no ticket template, so each agent copies whatever nearby file it read and guesses the rest. The `no-assumptions` rule then makes it stop and ask, so missing docs stall the pipeline.

The docs that do exist have no maintenance model. Nothing says which doc wins when a doc and the code disagree, which docs may be hand-edited, or when a doc must be updated. Two `laters.md` files hold notes for later MVPs. Files written by the mattpocock skills can be edited by any agent without the human noticing, even though the skills own them.

## Solution

Lay a documentation foundation that the factory can rely on and that stays correct over time:

- Every doc belongs to one of three kinds, declared in its front matter, and the kind decides who maintains it and what wins in a conflict: **Intent Docs** (why / what should be; outrank code), **Generated Docs** (produced from code by a script, never hand-edited; code outranks them) and **Descriptive Docs** (how it works today, hand-written; code outranks them).
- Docs are updated in the same PR as the change that affects them.
- Coding conventions per package, short per-package `AGENTS.md` routers, a testing policy, a definition of done, a ticket template, an escalation rule, factory docs and architecture docs.
- Five Generated Docs from a `pnpm docs:generate` script.
- Two glossary contexts (Chat and Factory) behind a `GLOSSARY-MAP.md`.
- Edits to files the mattpocock skills generated always prompt the human, even in auto mode.
- All enforcement (CI, drift checks, hooks) is recorded in `laters.md` for a later MVP, not built now.

## User Stories

1. As an agent starting a Ticket, I want the root `AGENTS.md` to point me to the right package `AGENTS.md`, so that I find the rules for the code I'm about to touch.
2. As an agent, I want each package `AGENTS.md` to be short (≤ 40 lines) and link out, so that I read it fully every time without wasting context.
3. As an agent, I want each rule written in exactly one place, so that I never meet two versions of it.
4. As an agent working in the API, I want API conventions with pointers to reference files, so that my module looks like the existing ones.
5. As an agent working in the web app, I want web conventions with pointers to reference files, so that my components, hooks and routes match the existing ones.
6. As an agent changing contracts, I want contracts conventions, so that I know what counts as a breaking change and that it must update API and web in the same PR.
7. As an agent, I want general conventions (TypeScript, naming, errors, imports, file and test placement) linked once from the root, so that they apply everywhere.
8. As an agent, I want conventions to point at real files instead of embedding snippets, so that the examples I copy are compiled and tested.
9. As an agent, I want every doc to declare its kind in front matter, so that I know whether to edit it, regenerate it, or leave it to a human.
10. As an agent, I want a precedence rule, so that when a doc and the code disagree I know whether to fix the code, fix the doc, or stop and ask.
11. As an agent, I want Generated Docs (ER diagram, package graph, HTTP routes, realtime events, ADR index) produced by one command, so that I never hand-edit them and they cannot drift silently.
12. As an agent changing the schema, routes or realtime events, I want the package `AGENTS.md` to tell me to run `pnpm docs:generate` and commit the result, so that Generated Docs stay current without CI.
13. As an agent, I want a definition of done, so that every PR I open passes the same checklist.
14. As an agent, I want a ticket template, so that every Ticket I read or write has the same fields (what to build, allowed packages, blocked by, status, acceptance criteria, verification, out of scope).
15. As an agent who is stuck, I want an escalation rule, so that I set `needs-info`, write my question under `## Comments` and stop instead of guessing.
16. As an agent, I want a testing policy that says which kinds of test a change needs, so that I add the right test, not just any test.
17. As an agent in a fresh container, I want a setup doc, so that I can get from a clean checkout to green tests (Docker, database up, migrate, seed) without guessing.
18. As an agent, I want architecture docs (overview, runtime flows), so that I understand how web, API, contracts and Postgres fit together before I change them.
19. As an agent, I want Chat terms and Factory terms in separate glossaries, so that I never write "the Ticket's Owner" or use "Member" for a process concept.
20. As an agent, I want "Ticket" to be the one word for a unit of work, so that I don't drift between "ticket" and "issue".
21. As an agent noticing something outside my Ticket, I want one `laters.md` to append it to, so that it is recorded without widening my Ticket.
22. As the human, I want any edit to a file generated by the mattpocock skills to prompt me, even in auto mode, so that the skills' config never changes without my approval.
23. As the human, I want to run the mattpocock setup skill myself to switch to multi-context glossaries, so that the skill rewrites its own block and no agent edits it.
24. As the human, I want conventions extracted from the existing code and approved by me in grilling sessions, so that they describe choices I actually made.
25. As the human, I want inconsistencies found while extracting conventions recorded as Tickets or `laters.md` entries, so that they are not silently baked in as conventions.
26. As the human, I want factory docs (overview, Ticket lifecycle, agent roles, gates, failure modes) written from grilling sessions, so that the pipeline encodes my decisions.
27. As the human, I want the documentation model recorded as an ADR, so that a future reader knows why some docs may not be hand-edited.
28. As the human, I want all enforcement work noted in one `laters.md` entry, so that I can pick it up as a whole in a later MVP.
29. As the human, I want a README that tells me what the app is, how to start it and where each docs folder is, so that I have a human entry point next to `AGENTS.md`.
30. As a reviewer, I want each Ticket to be one PR on its own branch, so that I review one doc or one script at a time.

## Implementation Decisions

**Documentation model**

- Three kinds: Intent Doc, Generated Doc, Descriptive Doc. Precedence: Intent Docs outrank code (code that contradicts one is the defect, or a new ADR changes the decision); code outranks Generated and Descriptive Docs (the doc is the defect).
- Every doc declares `kind: intent | generated | descriptive` in YAML front matter. Generated Docs also declare `generator` and `source`. Specs, Tickets and ADRs are exempt; their location implies their kind.
- Docs are updated in the same PR as the change. A periodic drift audit is deferred to `laters.md`.
- Recorded as ADR 0008 ("Documents are classed by how they are maintained"), written through the domain-modeling skill.

**Layout**

- `docs/architecture/`: Descriptive and Generated Docs about the product (overview, runtime flows, ER diagram, HTTP routes, realtime events, package graph, ADR index).
- `docs/conventions/`: Intent Docs `general`, `api`, `web`, `contracts`.
- `docs/workflow/`: per-Ticket rules (git workflow, no-assumptions, definition of done, ticket template, escalation, testing policy, setup).
- `docs/factory/`: the pipeline (overview, Ticket lifecycle, agent roles, gates, failure modes) and the Factory glossary.
- `docs/agents/`: mattpocock skill config only, unchanged.
- `docs/adr/`: all ADRs, one numbering, no per-context ADR folders.
- `docs/laters.md`: the single laters file; the root `laters.md` is merged into it and deleted.

**AGENTS.md**

- Root `AGENTS.md`: new sections go below the `## Agent skills` block, never inside it. Adds a "Packages" section routing to each package `AGENTS.md`, a link to general conventions, and the "ask first" rule for skill-generated files.
- One `AGENTS.md` per package (`api`, `web`, `contracts`): short sentences and links only: what the package is, its commands and what they need, links to its conventions file, relevant ADRs and reference files, and its hard "never" rules. No rule is restated; each lives in exactly one doc.
- Every `AGENTS.md` stays at or under about 40 lines.

**Conventions**

- One short rule per convention plus a pointer to a real reference file. No pasted code.
- First version extracted from the code by an agent, each file approved by the human in a grilling session. Inconsistencies become Tickets or `laters.md` entries. Later conventions are added when the same review comment repeats.

**Testing policy vs setup**

- The testing policy (which kinds of test a change needs) is an Intent Doc. How to run them (Docker, database, commands) is a Descriptive setup doc.

**Generated Docs**

- `pnpm docs:generate` at the root produces five Generated Docs: ER diagram from the Drizzle schema, workspace package graph, HTTP route list, realtime event list, ADR index (title and first sentence of each ADR, with a link). Output is Markdown with Mermaid diagrams.
- Each generator lives with its source: ER diagram and routes in the API package (routes read from controller route metadata without booting the app), realtime events in the contracts package, package graph and ADR index at the repo root.
- Root generators are TypeScript run directly by Node 24 and tested with Node's built-in test runner. No package is added, removed or changed.
- Running the command twice in a row leaves no diff.
- Until CI exists, the API and contracts `AGENTS.md` tell agents to run `pnpm docs:generate` after changing the schema, routes or realtime events, and the ticket template's verification section repeats it.

**Glossaries**

- Multi-context: `GLOSSARY-MAP.md` at the root lists Chat (the existing root `GLOSSARY.md`, unchanged) and Factory (in `docs/factory/`).
- Map relationships: the Factory produces changes to Chat's code and docs; no term is shared, and Chat terms are never used for process concepts or the reverse.
- Factory terms so far: Intent Doc, Generated Doc, Descriptive Doc, Laters, Ticket (avoid "issue"; the `issues/` folder keeps its name).
- The human switches the skill config to multi-context by running `/setup-matt-pocock-skills`; the glossary files follow, through the domain-modeling skill.

**Skill-generated files**

- The `## Agent skills` block in `AGENTS.md`, `docs/agents/*`, `docs/workflow/git-workflow.md`, `.agents/`, `.claude/skills/` and `skills-lock.json` are not read-only, but an agent MUST ask the human before changing them, even in auto mode.
- Enforced now by `permissions.ask` rules in the shared Claude Code settings. Because a rule can't target part of a file, the whole root `AGENTS.md` prompts. Known gaps: `bypassPermissions` mode skips prompts, and shell writes are not covered; the `AGENTS.md` rule says never to work around it via the shell.

**Laters**

- One `docs/laters.md`, free-form entries, any agent may append, an entry is removed when it becomes a spec.
- New entry "Enforce the doc and convention rules": enforcement tags per rule and "broken twice, automate it"; required CI checks (lint, typecheck, tests with Postgres, migration drift, generated-doc drift, front matter and link check) with branch protection and a required human approval; the `covers:` check that fails a PR touching covered code without its Descriptive Doc; a Stop hook running fast checks; removing the agent's pre-approved PR merge permission; the periodic drift audit.

## Testing Decisions

- A good test feeds a generator its real source and asserts on the Markdown it returns, not on how it builds it.
- One seam: each generator is a pure function from source to a Markdown string. File writing and the CLI wrapper stay thin and untested.
- API generators tested with the API package's existing test setup (no database needed); the realtime events generator with the contracts package's; root generators with Node's built-in test runner.
- Prior art: the colocated tests in the API and contracts packages, e.g. the contracts realtime tests.
- The command is checked to be idempotent (run twice, no diff).
- Doc-only Tickets have no automated tests; they are verified in PR review: links resolve, front matter present, `AGENTS.md` within its line budget.

## Out of Scope

- All enforcement: CI workflows, branch protection, the `covers:` check, Stop hooks, the drift audit, removing the merge permission (recorded in `laters.md`).
- Any package addition, removal or upgrade, including dedicated doc generators.
- Building the factory pipeline itself (dispatcher, worktrees, automated review); this spec only documents it.
- Moving or rewording the Chat glossary.
- Changing app behaviour.

## Further Notes

- Implementation runs on the feature branch `feat/00004-agent-docs-foundation` (see the git workflow). Each Ticket is one PR from its own `agent/00004-NN-<slug>` branch to the feature branch. Package changes and doc changes are never mixed.
- Tickets whose content is the human's decisions (conventions, testing policy, definition of done, factory docs) start with a grilling session; the agent writes up what was decided.
