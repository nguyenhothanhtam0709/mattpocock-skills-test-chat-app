# 01: Type `Tx` from the injected `Database` instead of `any`

**What to build:** `Tx` in `packages/api/src/messages/message-rows.ts` is `PgTransaction<NodePgQueryResultHKT, any, any>` with an `eslint-disable`, so helpers that take a transaction lose schema typing. Derive it from `Database`. A schema-typed `Tx` breaks `packages/api/src/db/seed.ts`, whose schema-less `drizzle(pool)` transaction isn't assignable to it, so `seed.ts` and any test setup with the same problem build their database with `{ schema }`. Touches the api package. Follows up [00002, ticket 06](../../00002-api-modules-and-nestjs-drizzle/issues/06-type-tx-from-injected-database.md), which asked whether `seed.ts` may change; the human's answer is yes.

**Allowed packages:** None

**Blocked by:** None

**Status:** ready-for-agent

- [ ] `Tx` is derived from `Database`, with no `any` and no `eslint-disable`
- [ ] `Reader` and `Tx` agree about the schema
- [ ] `seed.ts` and any affected test setup build their database with `{ schema }`
- [ ] `pnpm db:seed` still works against a fresh database

**Verification:** A type-only refactor, so no new test: existing tests stay green and none is weakened. Run `pnpm db:seed` once.

**Out of scope:** Other uses of `any`, and any change in behaviour.

## Comments
