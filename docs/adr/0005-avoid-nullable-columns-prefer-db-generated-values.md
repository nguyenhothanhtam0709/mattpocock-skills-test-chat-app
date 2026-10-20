# Avoid nullable columns; prefer database-generated values

Columns are `NOT NULL` unless absence is a real state in the domain. When a column can be filled by the database, let the database do it: a column default or a built-in function (`now()`, `uuidv7()`, `gen_random_uuid()`, generated columns) rather than a value computed in application code. This keeps the data consistent no matter which code path, script or migration inserts the row. It extends [ADR 0004](0004-db-generates-ids-and-created-timestamps.md).

- Default to `.notNull()`. Before making a column nullable, ask whether a default, a sentinel-free alternative (e.g. a separate table for the optional part) or a `NOT NULL DEFAULT` would model it better. If nullable is still right, say why in a comment on the column.
- Prefer a DB default over an app-supplied value whenever the value does not depend on application state.
- Add `CHECK`, `UNIQUE` and foreign-key constraints in the schema for invariants the data must hold, instead of relying on app code alone.

## Considered Options

- **Nullable by default, validate in the app**: rejected. Every reader has to handle `null`, and rows written outside the app can silently break invariants.
- **Compute defaults in the app**: rejected. Different code paths drift, and the DB cannot guarantee the value.
