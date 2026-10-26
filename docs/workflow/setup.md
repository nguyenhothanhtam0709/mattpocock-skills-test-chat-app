---
kind: descriptive
---

# Setup

From a clean checkout to green tests. Run every command from the repo root. Which tests a change needs is in the [testing policy](testing-policy.md).

## Prerequisites

- Node at the version in `engines` in [package.json](../../package.json).
- pnpm at the version in `packageManager` in the same file. If pnpm is not installed, `corepack enable` provides it. That replaces any global `pnpm` shim, so skip it if pnpm is already there.
- Docker with the daemon running. The local database and the API tests both need it.

## Install

```sh
pnpm install
```

## Environment

The API reads its config from `packages/api/.env`. Every variable is described in [.env.example](../../packages/api/.env.example) and validated by [config.ts](../../packages/api/src/config/config.ts). The defaults in the example match [docker-compose.yml](../../docker-compose.yml). Only the JWT key pair must be filled in: an Ed25519 key pair in PEM, newlines written as `\n`.

```sh
openssl genpkey -algorithm ed25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
grep -v '^JWT_' packages/api/.env.example > packages/api/.env
printf 'JWT_PRIVATE_KEY=%s\n' "$(awk '{printf "%s\\n", $0}' private.pem)" >> packages/api/.env
printf 'JWT_PUBLIC_KEY=%s\n' "$(awk '{printf "%s\\n", $0}' public.pem)" >> packages/api/.env
rm private.pem public.pem
```

Use `printf`, not `echo`: zsh's `echo` turns each `\n` into a real newline and breaks the file. `.env` is git-ignored. `pnpm db:migrate`, `pnpm db:seed` and `pnpm dev:api` need it. `pnpm test` does not.

## Database

```sh
pnpm db:up             # Postgres from docker-compose.yml on localhost:5432, waits until healthy
pnpm build:contracts   # migrate and seed compile the API, which imports the built contracts
pnpm db:migrate        # applies packages/api/drizzle/
pnpm db:seed           # optional dev data, safe to rerun, refuses in production
```

`pnpm db:down` stops it. The data stays in the `pgdata` volume. The seeded Users are listed in [seed.ts](../../packages/api/src/db/seed.ts).

Gotcha: `db:up` fails if something else already listens on port 5432. Stop that service or point `DATABASE_URL` at it.

## A second worktree

`node_modules` and `packages/api/.env` are git-ignored, so a new worktree has neither. From the new worktree's root:

```sh
pnpm install
cp "$(git worktree list | head -1 | cut -d' ' -f1)/packages/api/.env" packages/api/.env   # the first entry is the main checkout
```

If the main checkout has no `.env` either, create one as in [Environment](#environment).

Gotcha: every worktree uses the same ports: 3000 (API), 5173 (web) and 5432 (Postgres). Only one dev stack runs at a time. Stop it (`dev:api`, `dev:web`, then `pnpm db:down` in the worktree that started it) before starting one in another worktree. Docker Compose names the project after the folder, so each worktree's `db:up` gets its own `pgdata` volume: migrate and seed again there. `pnpm test` is not affected: the API tests start their own Postgres on a random port.

## Adding a dependency

When a dependency may be added at all: [no assumptions](no-assumptions.md).

```sh
pnpm --filter @chat/<package> add <name>      # runtime dependency
pnpm --filter @chat/<package> add -D <name>   # dev dependency
```

`<package>` is `api`, `web` or `contracts`. Commit the package's `package.json` and the root `pnpm-lock.yaml` together.

## Browser check

When one is needed: [testing policy](testing-policy.md). It runs the real API in dev mode against the local database. Nothing is mocked. Each of the last two commands keeps running, so give each its own terminal or background process.

```sh
pnpm db:up
pnpm build:contracts
pnpm db:migrate
pnpm db:seed    # the seeded Users to log in as
pnpm dev:api    # http://localhost:3000/api/v1
pnpm dev:web    # http://localhost:5173, proxies /api and /socket.io to the API
```

Then open http://localhost:5173 with the Chrome DevTools MCP. The seeded Users are `alice`, `bob`, `carol`, `dave` and `erin`, all with the password `password123` ([seed.ts](../../packages/api/src/db/seed.ts)). When done, stop `dev:api` and `dev:web`, then `pnpm db:down`.

## Tests

```sh
pnpm test
```

It builds contracts first, runs each package's tests one package at a time, then the root script tests. What each part needs:

| Tests                                   | Needs                                                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/api`                          | Docker. [global-setup.ts](../../packages/api/test/global-setup.ts) starts its own Postgres with Testcontainers and migrates it. It does not use `pnpm db:up` or `.env`. |
| `packages/api` with `TEST_DATABASE_URL` | That Postgres instead of a container. Tables are truncated before each test, so never point it at a database you care about.                                            |
| `packages/web`, `packages/contracts`    | Nothing. No database, no Docker. The web tests fake the network with MSW ([server.ts](../../packages/web/src/test/server.ts)).                                          |
| `scripts/docs` (`pnpm test:scripts`)    | Nothing. Node's built-in test runner.                                                                                                                                   |

To run one package: `pnpm build:contracts`, then `pnpm --filter @chat/<package> test`.

## Other checks

```sh
pnpm lint            # ESLint and Prettier check
pnpm typecheck       # builds contracts, then tsc in every package
pnpm docs:generate   # rewrites the Generated Docs in docs/architecture/
```

`pnpm format` fixes Prettier issues. See [package.json](../../package.json) for every script.
