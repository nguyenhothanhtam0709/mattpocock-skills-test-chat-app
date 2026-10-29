# 01: Migration-test seam (prefactor)

**What to build:** A new test seam for data migrations (spec 00006, "Testing Decisions", seam 2), so the Read Marker backfill in ticket 02 can be tested. Touches the api package (test support only) and docs.

- A reusable helper gives a test its own fresh database in the run's Testcontainers Postgres.
- It migrates that database up to a named migration, lets the test seed rows with plain SQL, then applies the remaining migrations.
- It doesn't disturb the shared database the other API tests use.

**Allowed packages:** None

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A test can migrate a fresh database up to a named migration, seed it with SQL, and apply the rest
- [ ] The helper is proven by a migration test against an existing migration that changes or constrains data
- [ ] The shared test database, the truncation between tests and the existing API tests are unaffected
- [ ] `docs/workflow/testing-policy.md` lists a "Migration test" kind, with this test as its example and a line on when a change needs one: any migration that rewrites or backfills existing rows
- [ ] No production code changes

**Verification:** The new migration test passes, and the full API test run stays green.

**Out of scope:** The Read Marker column and its backfill (ticket 02).

## Comments
