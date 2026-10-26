---
kind: intent
---

# General conventions

These apply to every package. Package rules are in [api](api.md), [web](web.md) and [contracts](contracts.md).

## Enforced by tools

Lint and the compiler already enforce some conventions: Zod-only validation, no `dangerouslySetInnerHTML`, no `any` or `@ts-` comments, Prettier style, strict mode, `noUncheckedIndexedAccess` and `.js` suffixes on relative imports (NodeNext). They are not restated here. See [eslint.config.js](../../eslint.config.js), [tsconfig.base.json](../../tsconfig.base.json) and [ADR 0002](../adr/0002-validate-input-encode-output-no-sanitizer.md).

## Naming

- Use the glossary terms (Member, Owner, Conversation, Former Member, ...) in code and test names. Start from [GLOSSARY-MAP.md](../../GLOSSARY-MAP.md). Example: [conversation-rules.ts](../../packages/api/src/messages/conversation-rules.ts).
- File names are kebab-case. API files take a role suffix (`.controller.ts`, `.service.ts`, `.module.ts`, `.guard.ts`). Example: [packages/api/src/groups/](../../packages/api/src/groups/). Web component files: see [web](web.md).

## TypeScript

- Use named exports only, never `export default`. Ambient `.d.ts` files are the only exception. Example: [auth.guard.ts](../../packages/api/src/auth/auth.guard.ts).
- Import Node built-ins with the `node:` prefix. Example: [config.ts](../../packages/api/src/config/config.ts).
- Use `interface` for named object shapes and `type` for unions and aliases. Examples: [clock.ts](../../packages/api/src/clock/clock.ts), [events.ts](../../packages/web/src/realtime/events.ts).

## Errors

- Every error that crosses the HTTP boundary is `{ error: { code, message, details? } }` with a stable `ErrorCode` from contracts. Clients and tests branch on the code, never on the message. See [error.ts](../../packages/contracts/src/error.ts).
- Throw a plain `Error` for impossible states, not a `DomainException`, so they become a logged 500. Example: `exactlyOne` in [message-rows.ts](../../packages/api/src/messages/message-rows.ts).

## Generated values

IDs and created timestamps come from the database ([ADR 0003](../adr/0003-drizzle-schema-is-source-of-truth.md), [ADR 0004](../adr/0004-db-generates-ids-and-created-timestamps.md), [ADR 0005](../adr/0005-avoid-nullable-columns-prefer-db-generated-values.md)). The only values app code generates are request ids and JWT `jti`/`iat`, and those timestamps go through the injected `Clock`. Example: [token.service.ts](../../packages/api/src/auth/token.service.ts).

## Tests

- In api and contracts, put each test next to its code as `*.test.ts`. Example: [groups.test.ts](../../packages/api/src/groups/groups.test.ts), [group.test.ts](../../packages/contracts/src/group.test.ts).
- Web feature tests that render `<App />` live flat in `packages/web/src/`. Example: [login.test.tsx](../../packages/web/src/login.test.tsx). Tests of a single web module sit next to it. Example: [socket-realtime.test.ts](../../packages/web/src/realtime/socket-realtime.test.ts).
- Shared test helpers live in the package's `test/` folder. Examples: [packages/api/test/](../../packages/api/test/), [packages/web/src/test/](../../packages/web/src/test/).
- Which tests to write and when to mock: see the [testing policy](../workflow/testing-policy.md).
