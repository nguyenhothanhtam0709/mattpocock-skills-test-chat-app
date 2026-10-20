# The database generates row IDs and "created at" timestamps

Columns whose value is just "a new unique ID" or "when this row was inserted" get a DB default in `packages/api/src/db/schema.ts` (``.default(sql`uuidv7()`)`` for IDs, `.defaultNow()` for timestamps; we run Postgres 18+, which has native `uuidv7()`). Insert code omits them and reads them back with `.returning()` when it needs them. Do not call `uuid()` / `randomUUID()` / `new Date()` in application code to fill them.

Pass a value from the app only when it is domain data rather than a row stamp: times derived from the injected `Clock` or a TTL (`expiresAt`, `rotatedAt`), or values that come from elsewhere (the JWT `exp` claim). These must share one `now` with the logic that compares against them, and the `Clock` is what lets tests control time.

## Considered Options

- **App-generated IDs and timestamps everywhere**: rejected. It duplicates what the database already guarantees, and every insert has to remember to set them.
- **DB defaults for everything, including `expiresAt`**: rejected. Expiry depends on config (the TTL) and must be computed from the same `now` as the query that checks it, so two clocks would disagree.
