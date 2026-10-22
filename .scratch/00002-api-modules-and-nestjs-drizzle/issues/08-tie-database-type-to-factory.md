# 08: Tie the `Database` type to what the factory builds

**What to build:** `Database` in `db/database.module.ts` is a hand-written `NodePgDatabase<typeof schema> & { $client: Pool }`, and nothing checks it against the `drizzle(instrumented, { schema })` call in the factory. Make the type follow the factory (for example derive it from the factory's return type, or check the factory against `Database`) so dropping or changing the schema argument fails typecheck.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Changing the `schema` argument in the factory without updating `Database` fails typecheck
- [x] The `@InjectDrizzle()` parameters still use the one shared `Database` type
- [x] All existing tests pass without edits

## Comments
