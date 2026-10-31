# Brief: Type `Tx` from the injected `Database`

Input for a grilling session after spec 00007. Not a Spec or a Ticket, and nothing here is decided.

## Problem

`Tx` in `packages/api/src/messages/message-rows.ts` is `PgTransaction<NodePgQueryResultHKT, any, any>` with an `eslint-disable`, so helpers that take a transaction lose schema typing. It is the one `any` in the API.

## What is known

- Ticket [00002-06](../00002-api-modules-and-nestjs-drizzle/issues/06-type-tx-from-injected-database.md) tried deriving `Tx` from `Database`, and it stayed `needs-info` until it was closed as `wontfix`.
- A schema-typed `Tx` breaks `packages/api/src/db/seed.ts`, whose schema-less `drizzle(pool)` transaction isn't assignable to it.
- Spec 00002 says the seed CLI keeps using `drizzle` directly.

## Questions for the grilling

- May `seed.ts` and any test setup with the same problem build their database with `{ schema }`, or should the `any` stay as the accepted exception?
- If `Tx` changes, how do `Reader` and `Tx` agree about the schema?
- Is this one Ticket, and does it need a Spec?

## If it goes ahead

Likely checks: `Tx` has no `any` and no `eslint-disable`, existing tests stay green without changes to what they test, and `pnpm db:seed` still works against a fresh database.
