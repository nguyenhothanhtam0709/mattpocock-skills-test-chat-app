# 04: Add `@nestjs/drizzle` and the shared `Database` type

**What to build:** The API has `@nestjs/drizzle` registered, built from the existing instrumented pool, plus one shared `Database` type for injecting it. Nothing consumes it yet (the expand step), so the app behaves as before. The package's compatibility with Nest 12 and the installed `drizzle-orm` is confirmed first.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] `@nestjs/drizzle` is added to the API (this ticket and the spec authorise adding that one package)
- [x] Before building on it, confirm it works with Nest 12 and the installed `drizzle-orm`; if it does not, stop and ask
- [x] The database module still builds the instrumented pool with its current settings and registers the Drizzle database from it as a ready-made database instance
- [x] One `Database` type (node-postgres Drizzle database with the app schema) exists for use with `@InjectDrizzle()`
- [x] The raw pool is still available for the health check
- [x] The app boots and shuts down cleanly; all existing tests pass without edits

## Comments
