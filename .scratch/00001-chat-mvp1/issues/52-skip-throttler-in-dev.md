# 52: Way to turn the rate limiter off in local development

**What to build:** The API's throttler (login 10 per 15 min per IP and 5 per identifier, registration 5 per hour, plus the global, search and send limits in `AppModule`) is held in process memory. While investigating ticket 51, repeated logins hit `429 RATE_LIMITED` and the only reset was restarting the API (`touch dist/main.js` under `node --watch`). The user wants a way to ignore the throttler in dev mode.

**Blocked by:** none

**Status:** resolved

- [x] A documented switch that disables every throttler limit for local development; default stays fully enabled
- [x] A dedicated config option controls it (an env var parsed in `config.ts` with the existing `EnvBoolean`, default off), independent of `NODE_ENV`: the API does not read or branch on `NODE_ENV` for this
- [x] Tests (API harness): switch off means more than the limit of requests succeed; switch on or unset keeps today's limits (existing throttle tests pass untouched)
- [x] README mentions it under local-dev setup
- [x] No package changes (ask first if needed)

## Questions (decide before building, no assumptions)

- Name of the env var (the user chose a dedicated config over `NODE_ENV`; `THROTTLE_DISABLED` is a proposed name, confirm). Raising `THROTTLE_LIMIT`/`THROTTLE_TTL_MS` is not enough: the per-route limits (`@Throttle` on login and register, the named `search`, `send`, `identifier` throttlers) ignore the global ones, so a config of the global values alone is not enough.
- Should it also be in the test config, or only for a developer's `.env`?

## Comments

- Requested by the user: "I think we should have a way to ignore throttler on dev mode".
- Decision from the user: use a dedicated config to disable the throttler, not `NODE_ENV`. Open point to confirm when building: with no `NODE_ENV` guard, a deployment that sets this flag runs unthrottled, so log a startup warning when it is on (not added to the ticket's scope without the user's say-so).
- Where the limits live: `packages/api/src/app.module.ts` (`ThrottlerModule.forRootAsync`, each throttler has a `skipIf`) and `@Throttle` on `register` and `login` in `auth.controller.ts`; `AppThrottlerGuard` is the global guard. A single `skipIf`/guard-level bypass would cover all of them.
- Decisions from the user on the open questions: the env var is `THROTTLE_DISABLED` (`EnvBoolean`, default off); it is for a developer's `.env` only (not in any test config; tests set it per test as needed); no startup warning is logged.
- Built: `THROTTLE_DISABLED` in `config.ts`; `AppThrottlerGuard.shouldSkip` returns true when it is on, which covers the global guard and the route-level search, send, login and register limits. Tests in `register.test.ts`; README and `.env.example` document it.
