# Chat

pnpm workspace: `packages/api` (NestJS 12 on Fastify, Drizzle + `pg`), `packages/web` (React + Vite + shadcn/ui), `packages/contracts` (shared Zod schemas). Requires Node 24, pnpm and Docker.

```sh
pnpm install
cp packages/api/.env.example packages/api/.env   # then fill JWT_PRIVATE_KEY / JWT_PUBLIC_KEY (Ed25519 PEM, see the file)
pnpm db:up          # local Postgres (docker compose)
pnpm db:migrate     # apply Drizzle migrations
pnpm db:seed        # optional: dev Users alice, bob, carol, dave, erin (password `password123`) with a Direct Conversation and a Group; refuses in production, safe to rerun
pnpm dev:api        # API on http://localhost:3000/api/v1
pnpm dev:web        # SPA on http://localhost:5173 (proxies /api to the API)
pnpm test           # every package's tests (API tests start Postgres via Testcontainers)
pnpm lint && pnpm typecheck
```

The API's rate limits are held in memory, so repeated logins during local work can hit `429 RATE_LIMITED`. Set `THROTTLE_DISABLED=true` in `packages/api/.env` and restart the API to turn off every limit (default `false`; never set it in a deployment).

Set `TEST_DATABASE_URL` to run API tests against an existing Postgres instead of Testcontainers. After changing `packages/api/src/db/schema.ts`, run `pnpm db:generate` and commit the new migration.
