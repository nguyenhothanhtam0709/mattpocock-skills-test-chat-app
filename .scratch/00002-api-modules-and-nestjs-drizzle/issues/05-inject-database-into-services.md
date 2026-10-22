# 05: Inject the database into the services

**What to build:** The services stop building their own Drizzle client from the pool and receive the injected database instead (the contract step). The pool is closed exactly once on shutdown, and slow queries are still logged.

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [x] The auth service, messages service, groups service, group memberships, conversation queries and the token deny list receive the database with `@InjectDrizzle()` typed as the shared `Database` type
- [x] The token deny list can be built from the injected database
- [x] The separate pool-shutdown provider is removed and the pool is closed exactly once on shutdown
- [x] The health check still uses the raw pool; the CLIs and tests outside Nest are unchanged
- [x] Slow-query logging still works; if no existing test covers it, add one assertion at the existing app-harness seam
- [x] All existing tests pass

## Comments
