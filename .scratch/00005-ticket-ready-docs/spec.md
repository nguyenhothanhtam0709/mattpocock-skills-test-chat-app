# Spec: Ticket-ready docs

Status: resolved

## Problem Statement

Spec 00004 laid the docs foundation. A dry run then had a fresh agent plan an existing Ticket (`.scratch/00003-client-side-router/issues/01-adopt-react-router.md`) from the root `AGENTS.md` alone. It found the right docs and made a correct plan, but a few things a Ticket needs are still not written down:

- `docs/workflow/setup.md` has no worktree section, no command for adding a dependency and no way to run the browser check the testing policy requires.
- `docs/factory/agent-roles.md` makes a separate worktree the default for the Implementer, though today one session works one Ticket at a time and a worktree costs setup and port clashes.
- The definition of done does not say how to open the PR (`gh` may not be logged in) or what to do when a check cannot run, such as the API tests without Docker. An earlier Ticket skipped them with no rule allowing it.
- The root `AGENTS.md` lists the per-Ticket docs in one sentence, in no order.

## Solution

Close those gaps with small edits to existing docs, each rule in exactly one place and the other docs linking it. No new doc is added.

## User Stories

1. As an agent in a second worktree, I want setup to say what a new worktree is missing and what shares ports, so that `pnpm test` and the dev servers do not fail for a reason that is not my change.
2. As an agent allowed to add a package, I want the exact command and the lockfile rule, so that I do not guess.
3. As an agent making a visible change, I want to know how to start the real app for the browser check, so that I can run it.
4. As the human, I want a worktree used only when Implementers run in parallel, so that a single session does not pay the setup cost.
5. As an agent opening a PR, I want to know which tool to use and how to write the body, so that the PR matches the definition of done.
6. As an agent that cannot run a check, I want a rule for what to do, so that I neither skip it silently nor guess.
7. As an agent starting a Ticket, I want the root `AGENTS.md` to give the order to read, so that I do not depend on following every link.
8. As an agent, I want each rule in exactly one doc, so that I never meet two versions of it.
9. As the human, I want an agent to merge a finished task PR into its feature branch without asking each time, so that implementing a spec does not stop on every Ticket.

## Implementation Decisions

- `docs/workflow/setup.md` (Descriptive Doc) gets three short sections: a second worktree, adding a dependency, and the browser check. Commands and gotchas only; it links the docs that own the rules.
- The browser check runs the real API in dev mode (`pnpm db:up`, `pnpm db:migrate`, `pnpm dev:api`, `pnpm dev:web`), with nothing mocked. How to run it lives in setup, not in the testing policy, which keeps saying which tests a change needs.
- `docs/factory/agent-roles.md` states the worktree default once: a separate worktree when several Implementers run at once, otherwise the main checkout. Any other doc that says the old default links there. The human confirms this in a grilling session first.
- `docs/workflow/definition-of-done.md` gets a short "Opening the PR" part (the GitHub MCP tools when `gh` is not logged in, and the `pr` skill for the body) and a short "A check you cannot run" part. An unrunnable check is not ticked, is named in the PR body and leaves the PR in draft, which the document already requires for any unticked item. No new exception is written. The human confirms the tool choice in a grilling session first.
- The root `AGENTS.md` `## Workflow` section is rewritten as an ordered list of links, below the `## Agent skills` block and never inside it. It prompts the human before the edit, and is never written through the shell.
- `docs/workflow/git-workflow.md` gives an agent standing permission to squash-merge a task PR into its feature branch once the PR is out of draft and has the latest feature branch merged in. Merging into `main` stays the human's. The human asked for this; the file is skill-generated, so the edit prompts and is never written through the shell (ticket 05).
- Every edited doc keeps its `kind`. Skill-generated files are not touched, except `docs/workflow/git-workflow.md` in ticket 05.

## Testing Decisions

- Docs only, so no automated test. A Ticket is verified in PR review: links resolve, front matter present, `pnpm lint` passes and `pnpm docs:generate` leaves no diff.
- Ticket 01 also checks every command against the `package.json` files.
- Ticket 04 re-runs the read-only cold-start dry run from the Problem Statement and reports whether the agent now reads the definition of done and the testing policy without being told.

## Out of Scope

- CI, branch protection, hooks, authenticating `gh` and the drift audit (all in `docs/laters.md`).
- Building the dispatcher or automating worktree creation.
- Rewording older Tickets that predate the ticket template.
- Cutting or merging the Factory and workflow docs, and checking skill names in the docs; both are for a separate grilling session (`docs/docs-enhancement-laters.md`).
- Changing app code or any package.

## Further Notes

- Implementation runs on the feature branch `feat/00005-ticket-ready-docs`, cut from `main` once this spec is on `main`. Each Ticket is one PR from its own `agent/00005-NN-<slug>` branch to the feature branch.
- Tickets 02 and 03 are the human's decisions, so each starts with a grilling session. Ticket 04 is blocked by 01 and 03 because it links to their sections.
