---
kind: intent
---

# Contracts conventions

Rules for `packages/contracts`, on top of the [general conventions](general.md).

## Package shape

- Contracts are Zod schemas only: no Nest, React or database code. One file per area, all re-exported from `index.ts`. Helper modules (`code-point.ts`, `realtime-events-doc.ts`) are not re-exported.
- api and web import contracts from `dist`. After changing contracts, run `pnpm build:contracts`. The root `test`, `typecheck` and `dev:*` scripts already run it.

## Schemas and types

- Every schema comes in a pair, `FooSchema` and `type Foo`. HTTP bodies are `XRequestSchema` and `XResponseSchema`. Responses are always wrapped in an object (`{ user }`, `{ message }`).
- A type a client builds before sending uses `z.input`. A type read after parsing (responses, and queries or bodies as the API receives them) uses `z.infer`.
- Use plain `z.object` by default. Use `z.strictObject` where an unknown key must be rejected: a profile update must not quietly ignore fields, and a search result must not leak extra User fields.
- Each exported schema has a doc comment naming its route or push audience.

## Enums and codes

- Export an enum-like set once as an `as const` value and wrap it in `z.enum`, so the database and API share it. Name maps (code to wire value) are objects. Plain sets are arrays. An inline `z.enum([...])` is fine for values only one schema uses.
- `ErrorCode` keys are SCREAMING_SNAKE. A new error means a new key in `ErrorCode`.
- Each realtime event has its name in `RealtimeEvent`, one `...EventSchema`, and an entry in `RealtimeEventSchemas`.

## User text

User-supplied text goes through the shared text schemas (`nameText`, `plainText`): NFC, no control or bidi characters. Count limits in code points and export them as constants (`GROUP_NAME_MAX`).

## Breaking changes

These changes are breaking:

- removing or renaming an export, a field, or an `ErrorCode` or `RealtimeEvent` value
- making an optional input field required, or a nullable input field non-null
- narrowing what input is accepted
- widening output a client branches on, such as a new enum value in a response

A breaking change updates api and web in the same PR. Adding optional input fields, adding output fields and adding a new `ErrorCode` are not breaking.

## Tests

Each area's tests sit next to it as `<area>.test.ts`, use vitest, and are table-driven with `it.each`. Test the boundaries: min and max, NFC, control characters.
