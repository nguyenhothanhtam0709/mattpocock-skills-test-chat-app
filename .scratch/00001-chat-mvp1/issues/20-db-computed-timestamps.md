# 20: DB-computed timestamps (stop passing `Date`s to the database)

**What to build:** Follow the amended ADR 0004: derived times (`expiresAt`, `rotatedAt`, "is it expired?" comparisons) are computed in SQL with `now()` / `CURRENT_TIMESTAMP` instead of being built from the injected `Clock` and passed in as `Date`s. Pass only durations.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `auth.service.ts`: `refreshExpiresAt` / `rotatedAt` and any other `Date` bound into inserts and updates become SQL (`` sql`now() + make_interval(secs => ${ttlSeconds})` `` or `` sql`now()` ``); no `new Date(now.getTime() + ttl)` left
- [ ] `postgres-token-deny-list.ts`: `expiresAt > now()` and `expiresAt <= now()` use SQL `now()`, not `clock.now()`. The adapter no longer takes a `Clock`. The `expiresAt` of an entry still comes from the JWT `exp` claim (external value, allowed)
- [ ] Refresh-token rotation and reuse-detection queries compare against SQL `now()` in the same statement or transaction as the write
- [ ] `Clock` stays only for JWT `iat` / `exp` in `token.service.ts`; remove it from everything else (`app.module.ts` wiring, constructors)
- [ ] Tests no longer advance a fake clock for DB-side expiry: they backdate rows (e.g. `UPDATE ... SET expires_at = now() - interval '1 second'`) or use short TTLs. Update `token-deny-list.contract.ts`, `logout.test.ts`, `session.test.ts`, `harness.test.ts` and `test/test-clock.ts` accordingly
- [ ] No schema change expected; if one is needed, generate the migration with `pnpm db:generate`
- [ ] No new packages. Lint, typecheck and all tests pass

## Notes

- Raised in review: passing `Date`s built from an app clock needs a second clock beside the database's. `now()` is fixed per transaction, so the write and its comparison agree. See the amended `docs/adr/0004-db-generates-ids-and-created-timestamps.md`.
- Any ticket landing in the meantime (08 and later) should already follow the ADR for new code.

## Comments
