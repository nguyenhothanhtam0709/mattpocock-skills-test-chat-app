# Spec: API feature modules and `@nestjs/drizzle`

Status: ready-for-agent

## Problem Statement

A developer working on the API finds every controller and provider registered in one flat `AppModule` list, along with all the rate-limit configuration. It is hard to see which feature owns what, and nothing stops one feature reaching into another. Each service also builds its own Drizzle client from the raw `pg` pool, repeating the same wiring and ignoring the framework's own Drizzle integration.

## Solution

Split the API into feature modules with explicit imports and exports and no cycles, then move database access onto the first-party `@nestjs/drizzle` module. Behaviour does not change: every existing test passes unchanged.

## User Stories

1. As a developer, I want each feature's controllers and providers in its own module, so that I can see what a feature owns and depends on.
2. As a developer, I want `AppModule` to only import modules, so that adding a feature never means editing a long flat list.
3. As a developer, I want module imports to form a graph with no cycles, so that no dependency is hidden behind `forwardRef`.
4. As a developer, I want `GroupMemberships` in its own module, so that the realtime and groups features can both use it without depending on each other.
5. As a developer, I want the auth providers separate from the auth controllers, so that realtime can use the authenticator without the auth feature depending on realtime.
6. As a developer, I want the rate-limit configuration in one throttling module, so that its route-specific rules stay together.
7. As a developer, I want the clock provided by a global clock module, so that any feature can inject it.
8. As a developer, I want the health check in its own module, so that it stays independent of the chat features.
9. As a developer, I want `createApp` and `AppModule.register(rawConfig, clock, logger)` to keep working unchanged, so that the test harness and `main.ts` need no changes.
10. As a developer, I want the database injected with `@InjectDrizzle()`, so that services stop calling `drizzle(pool)` themselves.
11. As a developer, I want one shared `Database` type for the injected database, so that every service has the same typed schema without repeating the generic.
12. As an operator, I want slow queries still logged and the pool settings unchanged, so that nothing about database observability regresses.
13. As an operator, I want the pool closed exactly once on shutdown, so that the process exits cleanly.
14. As a user of the chat app, I want everything to behave exactly as before, so that the refactor is invisible to me.
15. As a future contributor, I want an ADR recording the module rules and the Drizzle injection, so that I know why it was built this way.

## Implementation Decisions

- Modules: `ClockModule` (global), `ThrottlingModule` (config and the global throttler guard), `HealthModule`, `MembershipsModule` (`GroupMemberships`), `AuthModule` (auth service, token service, access-token authenticator, auth guard, token deny list), a module for the auth and users controllers, `RealtimeModule`, `MessagesModule`, `GroupsModule`.
- Dependency graph: Realtime → Auth, Memberships. Messages → Realtime. Groups → Realtime, Messages, Memberships. The auth controllers module → Auth, Realtime. No `forwardRef`; `@Global()` only for clock, database and Drizzle.
- `AppModule.register(rawConfig, clock, logger)` stays as the entry point and imports the config, logging, database, errors, throttling, clock and feature modules.
- The throttler's route constants stay next to the throttler config. No behaviour change to any limit.
- `DatabaseModule` keeps building the instrumented `pg` pool and registers the Drizzle database from it with `DrizzleModule.forRootAsync` and a `db` instance. `PG_POOL` remains for the health check.
- One `Database` type (the node-postgres Drizzle database with the app schema) is defined in the database area and used for every `@InjectDrizzle()` parameter.
- The six places that call `drizzle(pool)` in a constructor (auth service, messages service, groups service, group memberships, conversation queries, token deny list) switch to the injected database. The token deny list becomes constructible from the injected database.
- `PoolShutdown` is removed; the Drizzle module closes the client on shutdown.
- `@nestjs/drizzle` is added as a dependency; this spec is the authorisation to add that one package. Before using it, confirm it works with Nest 12 and the installed `drizzle-orm`; if it does not, stop and ask.
- Out of Nest, the migration and seed CLIs and the tests keep using `pg` and `drizzle` directly.
- Add an ADR describing the module rules and the Drizzle injection. No glossary change.
- Delivered in two steps, modules first, then `@nestjs/drizzle`.

## Testing Decisions

- A good test here only checks external behaviour through the existing seam, never module layout.
- The only seam is the existing app harness: the real app booted against the run's Postgres, driven through HTTP injection and a Socket.IO client. No new seams.
- No new tests for module wiring: a missing import or export fails app boot, so every existing test would fail.
- The existing auth, groups, messages, realtime, health, security, logging and request-logging suites must pass unchanged. They also cover queries, transactions, slow-query logging and clean shutdown.
- If a gap shows up (for example, nothing asserting slow-query logging through the injected database), add one assertion at the same seam.
- Prior art: the existing `withApp`-based suites.

## Out of Scope

- Any behaviour, route, schema or config change.
- Moving the migration and seed CLIs or the tests onto Nest or `@nestjs/drizzle`.
- Moving `HealthController` off the raw pool.
- Changing the logging module, the config module, or the single-instance design (ADR 0006).
- Adding Drizzle features beyond injection.

## Further Notes

- `@nestjs/drizzle` is at 0.0.x, so its API may change.
- Cycles found while tracing: Auth ↔ Realtime, Realtime ↔ Groups, and Realtime/Messages/Groups. The module split in this spec removes all of them.
