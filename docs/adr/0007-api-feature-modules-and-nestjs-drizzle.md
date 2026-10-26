# The API is split into feature modules and injects the database through `@nestjs/drizzle`

Every controller and provider lives in its feature's module, and providers receive the database through `@nestjs/drizzle`. These two rules replace a flat `AppModule` that listed every controller and provider, and services that each built their own `drizzle(pool)` from the raw `pg` pool.

## Feature modules

- `AppModule` is a thin shell that only imports modules. Every controller and provider lives in the module of its feature.
- Module imports form a graph with no cycles. We do not use `forwardRef`, and `@Global()` is only for cross-cutting infrastructure (`ClockModule`, `DatabaseModule`, and the Drizzle module).
- Cycles are broken by moving the shared leaf into its own module, not by hiding the coupling. `GroupMemberships` lives in its own module so `RealtimeModule` and `GroupsModule` can both depend on it. The auth controllers live apart from the auth providers so `AuthModule` does not depend on `RealtimeModule`.
- Rate limiting is its own module. Its skip rules name routes from several features, so they stay together.

## `@nestjs/drizzle`

- `DatabaseModule` still builds the instrumented `pg` pool (slow-query logging, pool settings) and registers the Drizzle database from it, so instrumentation is kept.
- Providers receive the database with `@InjectDrizzle()`, typed with one shared `Database` type, instead of calling `drizzle(pool)` themselves.
- The CLIs (`migrate`, `seed`) and the tests run outside Nest and keep using `pg` and `drizzle` directly.

## Considered Options

- **`forwardRef` between modules**: rejected. It is cheaper now but hides the coupling.
- **Keep calling `drizzle(pool)` in each service**: rejected. It repeats the same wiring in six places and does not use the framework's lifecycle (shutdown) or its future integrations.
- **Let `@nestjs/drizzle` create the database from a connection config**: rejected. It would lose the pool instrumentation.
