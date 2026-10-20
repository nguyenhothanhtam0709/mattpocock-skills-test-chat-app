# 01: Workspace and test harness skeleton

**What to build:** A developer clones the repo, starts local Postgres, and runs one command each to start the API, start the SPA, and run all tests. The SPA shows an "API healthy" page backed by a real `GET /api/v1/health` call that checks the database. Every agreed test seam exists with one passing test, so later tickets only add tests, never harnesses.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] pnpm workspace with three packages: API (NestJS on the Fastify adapter), web (React + Vite + TypeScript), contracts (Zod schemas shared by both)
- [ ] Node 24, native ESM, TypeScript strict everywhere; NestJS 12 ESM support confirmed (note in the PR if a workaround was needed)
- [ ] ESLint + Prettier; lint bans `dangerouslySetInnerHTML` in application code and any import of `class-validator` / `class-transformer`
- [ ] docker-compose for local Postgres; Drizzle with the `pg` driver and a migration workflow
- [ ] `GET /api/v1/health` (unauthenticated) reports healthy when the DB is reachable, and unhealthy otherwise; response shape defined in contracts
- [ ] shadcn/ui initialised in the web app (Base UI, `nova`, lucide); the health page uses shadcn components and semantic tokens
- [ ] Backend app seam: tests boot the real Nest app against Postgres in Testcontainers (migrations once per run, all tables truncated between tests) and call it through Fastify `inject()`
- [ ] Contracts seam: schema tests run directly against contracts
- [ ] SPA seam: Testing Library renders the full app with MSW intercepting HTTP; the health page has a test
- [ ] Injectable clock provider exists and can be overridden in app tests
- [ ] One command runs every package's tests; lint and typecheck pass
