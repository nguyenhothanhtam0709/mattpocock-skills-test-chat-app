# The Drizzle schema is the source of truth; migrations are generated

The database shape is defined in `packages/api/src/db/schema.ts`. Migrations are generated from it with `pnpm db:generate` (`drizzle-kit generate`) and committed alongside the schema change. Never hand-write or hand-edit a generated migration or its `meta/` snapshot; change the schema and regenerate instead.

## Considered Options

- **Hand-written SQL migrations as the source of truth**: rejected. The schema file and the database would drift, and Drizzle's types and snapshots would no longer describe what actually exists.
- **`drizzle-kit push` against shared databases**: rejected. It leaves no reviewable migration history.
