# 01: Workspace and test harness skeleton

**What to build:** A developer clones the repo, starts local Postgres, and runs one command each to start the API, start the SPA, and run all tests. The SPA shows an "API healthy" page backed by a real `GET /api/v1/health` call that checks the database. Every agreed test seam exists with one passing test, so later tickets only add tests, never harnesses.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] pnpm workspace with three packages: API (NestJS on the Fastify adapter), web (React + Vite + TypeScript), contracts (Zod schemas shared by both)
- [x] Node 24, native ESM, TypeScript strict everywhere; NestJS 12 ESM support confirmed (note in the PR if a workaround was needed)
- [x] ESLint + Prettier; lint bans `dangerouslySetInnerHTML` in application code and any import of `class-validator` / `class-transformer`
- [x] docker-compose for local Postgres; Drizzle with the `pg` driver and a migration workflow
- [x] `GET /api/v1/health` (unauthenticated) reports healthy when the DB is reachable, and unhealthy otherwise; response shape defined in contracts
- [x] shadcn/ui initialised in the web app (Base UI, `nova`, lucide); the health page uses shadcn components and semantic tokens
- [x] Backend app seam: tests boot the real Nest app against Postgres in Testcontainers (migrations once per run, all tables truncated between tests) and call it through Fastify `inject()`
- [x] Contracts seam: schema tests run directly against contracts
- [x] SPA seam: Testing Library renders the full app with MSW intercepting HTTP; the health page has a test
- [x] Injectable clock provider exists and can be overridden in app tests
- [x] One command runs every package's tests; lint and typecheck pass

## Answer

Implemented on branch `agent/01-workspace-and-test-harness` (packages `api`, `web`, `contracts`; commands in `README.md`). NestJS 12 ESM worked without a workaround (`module: NodeNext`, SWC in Vitest, `tsc` build for `node dist/main.js`). The Testcontainers path in `packages/api/test/global-setup.ts` could not be run where this was built (no Docker); the API suite was run against a local Postgres via `TEST_DATABASE_URL`, so run `pnpm test` once with Docker to confirm that path.
