# Chat

pnpm workspace: `packages/api` (NestJS 12 on Fastify, Drizzle + `pg`), `packages/web` (React + Vite + shadcn/ui), `packages/contracts` (shared Zod schemas). Requires Node 24, pnpm and Docker.

```sh
pnpm install
cp packages/api/.env.example packages/api/.env   # then fill JWT_PRIVATE_KEY / JWT_PUBLIC_KEY (Ed25519 PEM, see the file)
pnpm db:up          # local Postgres (docker compose)
pnpm db:migrate     # apply Drizzle migrations
pnpm dev:api        # API on http://localhost:3000/api/v1
pnpm dev:web        # SPA on http://localhost:5173 (proxies /api to the API)
pnpm test           # every package's tests (API tests start Postgres via Testcontainers)
pnpm lint && pnpm typecheck
```

Set `TEST_DATABASE_URL` to run API tests against an existing Postgres instead of Testcontainers. After changing `packages/api/src/db/schema.ts`, run `pnpm db:generate` and commit the new migration.
