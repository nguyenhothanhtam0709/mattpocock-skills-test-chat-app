# The database generates row IDs and timestamps

Columns whose value is just "a new unique ID" or "when this row was inserted" get a DB default in `packages/api/src/db/schema.ts` (``.default(sql`uuidv7()`)`` for IDs, `.defaultNow()` for timestamps; we run Postgres 18+, which has native `uuidv7()`). Insert code omits them and reads them back with `.returning()` when it needs them. Do not call `uuid()` / `randomUUID()` / `new Date()` in application code to fill them.

The same goes for derived times. Compute them in SQL with `now()` (`CURRENT_TIMESTAMP`) instead of passing a `Date` from the app: `expires_at = now() + make_interval(secs => $ttl)` on insert or update, `expires_at > now()` and `expires_at <= now()` in `WHERE` clauses. `now()` is fixed for the whole transaction, so the write and the comparison it belongs to agree on one instant, and every code path stamps rows from the same clock. Pass only the duration (the TTL from config), never the resulting timestamp. In Drizzle use `` sql`now()` `` or `` sql`now() + ${interval}` ``; for a column that is always "now plus TTL" prefer a default or a generated expression when one fits.

Pass a timestamp from the app only when it comes from outside the database: the JWT `exp` claim (e.g. the deny-list entry's `expiresAt`) or a value the client sent. Signing JWTs (`iat`, `exp`) stays on the injected `Clock`, since the token is built and verified in the app.

Tests cannot fake `now()`. To move time, backdate the rows under test (e.g. `UPDATE ... SET expires_at = now() - interval '1 second'`) rather than advancing a fake clock.

## Considered Options

- **App-generated IDs and timestamps everywhere**: rejected. It duplicates what the database already guarantees, and every insert has to remember to set them.
- **App-supplied `expiresAt` / `rotatedAt` from the injected `Clock`**: rejected (this reverses the earlier carve-out). It needs a second clock beside the database's, and the two can disagree. SQL `now() + interval` keeps the write and the comparison on one clock; tests backdate rows instead.
