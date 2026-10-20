# Git workflow

## Rules

- You MUST NOT push directly to `main`.
- Every commit MUST reach `main` through a pull request.
- Work on a branch per task (e.g. `agent/<issue>-<short-name>`), open a PR, and wait for a human to review and merge.
- Do not merge your own PR.

## Flow

1. Create a branch from up-to-date `main`.
2. Commit in small steps on that branch.
3. Run lint, typecheck and tests locally before opening the PR.
4. Push the branch and open a PR that links the issue and states how the change was verified.
5. Address review feedback with further commits on the same branch.
6. A human squash-merges the PR and deletes the branch.
