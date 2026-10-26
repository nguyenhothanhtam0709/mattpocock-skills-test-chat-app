---
kind: intent
---

# API package

The NestJS server on Fastify. It serves the HTTP API, pushes realtime events over Socket.IO and owns the Postgres schema through Drizzle. How it fits with web and contracts: [architecture overview](../../docs/architecture/overview.md).

## Commands

Run from the repo root. Setup, `.env` and what each test run needs: [setup](../../docs/workflow/setup.md).

- `pnpm dev:api`: needs the database up (`pnpm db:up`, `pnpm db:migrate`) and `packages/api/.env`.
- `pnpm build:contracts`, then `pnpm --filter @chat/api test`: needs Docker running. The tests start their own Postgres.
- `pnpm db:generate`: writes a migration after a change to [schema.ts](src/db/schema.ts).
- `pnpm docs:generate`: run it after changing the schema, routes or realtime events, and commit the result.

## Rules

- [API conventions](../../docs/conventions/api.md) and [general conventions](../../docs/conventions/general.md).
- Which tests a change needs: [testing policy](../../docs/workflow/testing-policy.md).
- ADRs: [0001 server-push-only WebSocket](../../docs/adr/0001-websocket-is-server-push-only.md), [0002 validate input, encode output](../../docs/adr/0002-validate-input-encode-output-no-sanitizer.md), [0006 single instance](../../docs/adr/0006-api-runs-as-a-single-instance.md), [0007 feature modules](../../docs/adr/0007-api-feature-modules-and-nestjs-drizzle.md).

## Never

- Never hand-edit a migration in `drizzle/` ([ADR 0003](../../docs/adr/0003-drizzle-schema-is-source-of-truth.md)).
- Never pass IDs or created timestamps from app code ([ADR 0004](../../docs/adr/0004-db-generates-ids-and-created-timestamps.md)).

## Reference files

- A feature module: [groups/](src/groups/). Wiring: [app.module.ts](src/app.module.ts).
- Test harness: [app-harness.ts](test/app-harness.ts) and [people.ts](test/people.ts).
- Generated Docs from this package: [ER diagram](../../docs/architecture/er-diagram.md) and [HTTP routes](../../docs/architecture/http-routes.md).
