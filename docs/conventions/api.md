---
kind: intent
---

# API conventions

Rules for `packages/api`. [General conventions](general.md) also apply. Paths below are relative to `packages/api/src/` unless they start with `packages/`.

## Modules

- One feature is one folder holding its controller, service, module and tests. `AppModule` only imports modules ([ADR 0007](../adr/0007-api-feature-modules-and-nestjs-drizzle.md)). Examples: [groups.module.ts](../../packages/api/src/groups/groups.module.ts), [app.module.ts](../../packages/api/src/app.module.ts).
- No import cycles and no `forwardRef`. Give a shared leaf its own module. Use `@Global()` only for Clock, Database and Logging. Example: [memberships.module.ts](../../packages/api/src/memberships/memberships.module.ts).

## Controllers

- Controllers are thin: validate, call one service method, return the contract type. No database access and no business rules. Example: [groups.controller.ts](../../packages/api/src/groups/groups.controller.ts).
- Validate bodies and queries with `ZodValidationPipe` and a contracts schema, and path ids with `ZodValidationPipe(z.uuid())`. Example: [messages.controller.ts](../../packages/api/src/messages/messages.controller.ts).
- Handlers return contracts types and set the status with `@HttpCode`. Responses are not validated on output ([ADR 0002](../adr/0002-validate-input-encode-output-no-sanitizer.md)). Use `@Res({ passthrough: true })` only when the status depends on the outcome, as the idempotent resend in [messages.controller.ts](../../packages/api/src/messages/messages.controller.ts) does.
- Every non-public route uses `@UseGuards(AuthGuard)` and reads the caller with `@Auth()`. Only register, login, refresh and health are public. See [auth.guard.ts](../../packages/api/src/auth/auth.guard.ts).

## Services and database access

- Services get the database with `@InjectDrizzle() private readonly db: Database`. Only CLIs and tests call `drizzle(pool)` ([ADR 0007](../adr/0007-api-feature-modules-and-nestjs-drizzle.md)). Example: [groups.service.ts](../../packages/api/src/groups/groups.service.ts).
- Run multi-step writes in `db.transaction`. Re-check rules that depend on membership under the Conversation lock. Examples: [groups.service.ts](../../packages/api/src/groups/groups.service.ts), [commit-order.ts](../../packages/api/src/messages/commit-order.ts).
- Shared access rules are `require*` helpers that take a `Reader`. Shared queries live in `*-queries.ts` and row mapping in `message-rows.ts`. A query only one service uses may stay private in that service. Examples: [conversation-rules.ts](../../packages/api/src/messages/conversation-rules.ts), [conversation-queries.ts](../../packages/api/src/messages/conversation-queries.ts).
- The schema and migrations follow [ADR 0003](../adr/0003-drizzle-schema-is-source-of-truth.md) and [ADR 0005](../adr/0005-avoid-nullable-columns-prefer-db-generated-values.md). See [schema.ts](../../packages/api/src/db/schema.ts).

## Errors

- Throw domain failures as `DomainException(ErrorCode, HttpStatus, message, details?)`. The one `AllExceptionsFilter` maps everything else. See [all-exceptions.filter.ts](../../packages/api/src/common/all-exceptions.filter.ts).
- Throw `DomainException` inline by default. Add a named factory once two or more places throw the same error. Example: `conversationNotFound()` in [conversation-rules.ts](../../packages/api/src/messages/conversation-rules.ts).
- Map Postgres constraint violations to domain errors by constraint name. Example: `users_username_lower_unique` in [auth.service.ts](../../packages/api/src/auth/auth.service.ts).

## Throttling

The global default limit comes from `ThrottlingModule` and `AppThrottlerGuard`. Per-User named throttlers (search, send) are set in the module. Per-IP limits are `@Throttle` on the route. Examples: [throttling.module.ts](../../packages/api/src/throttling/throttling.module.ts), [auth.controller.ts](../../packages/api/src/auth/auth.controller.ts).

## Config and logging

- Read config only through `loadConfig` or `ConfigService<Config, true>`. Only `main.ts` and the CLIs read `process.env`. See [config.ts](../../packages/api/src/config/config.ts).
- The server logs through the injected pino (`PINO`), never `console.*`. CLIs may print. See [logging.module.ts](../../packages/api/src/logging/logging.module.ts).

## Tests

- Tests run the real app against Testcontainers Postgres through `withApp`. Adapters of one port share a `*.contract.ts` suite. Examples: [app-harness.ts](../../packages/api/test/app-harness.ts), [token-deny-list.contract.ts](../../packages/api/src/auth/token-deny-list.contract.ts).
- Create test Users with `signUp` from [people.ts](../../packages/api/test/people.ts). Example: [leave-group.test.ts](../../packages/api/src/groups/leave-group.test.ts).
