# Contracts package

The Zod schemas and types that api and web share: HTTP bodies, error codes and realtime events. Both import it from `dist`. How it fits with api and web: [architecture overview](../../docs/architecture/overview.md).

## Commands

Run from the repo root. Setup and what each test run needs: [setup](../../docs/workflow/setup.md).

- `pnpm build:contracts`: rebuilds `dist`. Run it after a change so api and web see it.
- `pnpm --filter @chat/contracts test`: needs nothing. No database, no Docker.
- `pnpm docs:generate`: run it after changing the realtime events, and commit the result.

## Rules

- [Contracts conventions](../../docs/conventions/contracts.md) and [general conventions](../../docs/conventions/general.md).
- Which tests a change needs: [testing policy](../../docs/workflow/testing-policy.md).
- ADRs: [0001 server-push-only WebSocket](../../docs/adr/0001-websocket-is-server-push-only.md), [0002 validate input, encode output](../../docs/adr/0002-validate-input-encode-output-no-sanitizer.md).

## Never

- Never ship a breaking schema change alone. It updates api and web in the same PR ([breaking changes](../../docs/conventions/contracts.md#breaking-changes)).

## Reference files

- Exports: [index.ts](src/index.ts). Errors: [error.ts](src/error.ts). Realtime events: [realtime.ts](src/realtime.ts).
- Example test: [group.test.ts](src/group.test.ts).
- Generated Doc from this package: [realtime events](../../docs/architecture/realtime-events.md).
