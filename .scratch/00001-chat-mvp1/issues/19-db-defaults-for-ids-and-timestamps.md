# 19: DB Defaults for Generated IDs and Timestamps

**What to build:** Run Postgres 18, then stop generating row IDs and "created at" timestamps in the app. Let the database fill them in via column defaults, following ADR 0004.

**Blocked by:** none

**Status:** resolved

- [x] Postgres is bumped to 18: `docker-compose.yml` (`postgres:18-alpine`) and the Testcontainers image in `packages/api/test/global-setup.ts`; check the `pgdata` volume mount path still matches the PG 18 image layout
- [x] `users.id` and `sessions.id` get a DB default (`` .default(sql`uuidv7()`) ``, native in PG 18, so IDs stay time-ordered); inserts stop passing `id`, and the service reads the generated id back with `.returning()` (the session id is still needed to sign the access token)
- [x] `sessions.createdAt` gets `.defaultNow()`; inserts stop passing it
- [x] The `uuid` package is dropped from the id paths in `auth.service.ts` (still used for the JWT `jti` in `token.service.ts`, which is not a row ID)
- [x] Left as-is on purpose: `sessions.rotatedAt`, `sessions.expiresAt` and `token_deny_list.expiresAt` are derived from the injected `Clock` / the JWT `exp` claim, and the refresh query compares against the same `now`
- [x] Migration generated with `pnpm db:generate`, not hand-written
- [x] Existing tests still pass; any test that asserted `createdAt` against the fake clock is adjusted

## Notes

- Native `uuidv7()` arrived in PG 18, which is why the version bump is part of this ticket.
- Raised in review: the app was passing `uuidv7()` and `new Date()` into inserts where a column default would do.

## Comments
