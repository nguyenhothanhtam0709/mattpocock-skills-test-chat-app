---
kind: descriptive
---

# A second worktree

`node_modules` and `packages/api/.env` are git-ignored, so a new worktree has neither. From the new worktree's root:

```sh
pnpm install
cp "$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")/packages/api/.env" packages/api/.env   # from the main checkout
```

If the main checkout has no `.env` either, create one as in [Environment](setup.md#environment).

Gotcha: every worktree uses the same ports: 3000 (API), 5173 (web) and 5432 (Postgres). Only one dev stack runs at a time. Stop it (`dev:api`, `dev:web`, then `pnpm db:down` in the worktree that started it) before starting one in another worktree. Docker Compose names the project after the folder, so each worktree's `db:up` gets its own `pgdata` volume: migrate and seed again there. `pnpm test` is not affected: the API tests start their own Postgres on a random port.
