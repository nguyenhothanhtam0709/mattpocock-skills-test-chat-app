# Git workflow

## Rules

- You MUST NOT push directly to `main`. You MUST NOT push directly to a feature branch except to create it or to merge `main` into it.
- Every commit MUST reach `main` through a pull request.
- Specs and Tickets (everything under `.scratch/`) go straight to `main`: one branch from `main`, one PR to `main`.
- Implementing a spec happens on a **feature branch** named `feat/<NNNNN>-<feature-slug>`, exactly matching the spec's `.scratch/NNNNN-<feature-slug>/` folder (e.g. `feat/00004-agent-docs-foundation`). It is cut from `main` once the spec is on `main`.
- Each Ticket gets a **task branch** `agent/<NNNNN>-<NN>-<ticket-slug>` (e.g. `agent/00004-01-ask-before-editing-skill-files`), cut from the feature branch, with a PR targeting the feature branch.
- You MUST NOT merge your own PR, except a task PR into its feature branch when the human has explicitly allowed it. You MUST NOT merge a feature PR into `main`.

## Flow

### Spec and Tickets

1. Create a branch from up-to-date `main`.
2. Write the spec and Tickets, open a PR to `main`.
3. A human squash-merges it.

### Implementing a Ticket

1. Fetch and pull the feature branch, creating it from up-to-date `main` if it doesn't exist yet. If `main` has moved on, merge `main` into the feature branch first (merge, never rebase: the branch is shared).
2. Check out a task branch from the feature branch.
3. Commit in small steps on that branch.
4. Run lint, typecheck and tests locally before opening the PR.
5. Push the task branch and open a PR to the feature branch that links the Ticket and states how the change was verified.
6. Address review feedback with further commits on the same branch.
7. A human squash-merges the PR into the feature branch (or the AI does, only if the human explicitly allowed it) and deletes the task branch.

### Finishing the feature

1. When every Ticket is resolved, set `Status: resolved` in `spec.md` through a task PR as above.
2. Open a PR from the feature branch to `main`.
3. A human merges it with a merge commit (not squash), keeping one commit per Ticket on `main`, and deletes the feature branch.
