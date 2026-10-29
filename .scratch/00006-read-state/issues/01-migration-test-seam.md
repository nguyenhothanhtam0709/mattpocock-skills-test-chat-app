# 01: Migration-test seam (prefactor)

**What to build:** A new test seam for data migrations (spec 00006, "Testing Decisions", seam 2), so the Read Marker backfill in ticket 02 can be tested. Touches the api package (test support only) and docs.

- A reusable helper gives a test its own fresh database in the run's Testcontainers Postgres.
- It migrates that database up to a named migration, lets the test seed rows with plain SQL, then applies the remaining migrations.
- It doesn't disturb the shared database the other API tests use.

**Allowed packages:** None

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A test can migrate a fresh database up to a named migration, seed it with SQL, and apply the rest
- [x] The helper is proven by a migration test against an existing migration that changes or constrains data
- [x] The shared test database, the truncation between tests and the existing API tests are unaffected
- [x] `docs/workflow/testing-policy.md` lists a "Migration test" kind, with this test as its example and a line on when a change needs one: any migration that rewrites or backfills existing rows
- [x] No production code changes

**Verification:** The new migration test passes, and the full API test run stays green.

**Out of scope:** The Read Marker column and its backfill (ticket 02).

## Comments

Resolved. `withDatabaseMigratedUpTo(tag, test)` in `packages/api/test/migration-database.ts` creates a fresh database in the run's Postgres, runs Drizzle's migrator on a temporary copy of `drizzle/` whose journal ends at `tag` (inclusive), hands the test a `pool` and `migrateRest()` (the production `runMigrations`), then drops the database. `packages/api/src/db/migrations.test.ts` proves it on 0010 (existing Messages get kind `text`, and the seed runs against the pre-0010 schema), plus the shared database staying untouched and an unknown name failing. Testing policy gains the "Migration test" kind and its rule. Verified: `pnpm lint`, `pnpm typecheck`, `pnpm test` green; `pnpm docs:generate` leaves no diff.

- Assumption: `docs:generate` on the feature branch had an unrelated stale `adr-index.md` (ADR 0009 missing); the regenerated file is committed in this PR.
- For ticket 02: Drizzle Kit supports hand-written SQL through `pnpm db:generate --custom --name=<name>` (an empty migration it registers in the journal), so the backfill needs no hand edit of a generated file.
