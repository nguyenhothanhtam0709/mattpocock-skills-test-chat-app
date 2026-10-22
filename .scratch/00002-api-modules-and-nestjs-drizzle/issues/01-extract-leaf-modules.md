# 01: Extract the leaf modules

**What to build:** The clock, rate limiting, health check and group memberships each live in their own module instead of the flat `AppModule` list. This is the prefactor: group memberships get their own module so the realtime and groups features can later both depend on it without depending on each other. The app behaves exactly as before.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] A global clock module, a throttling module (config and the global throttler guard, limits and route rules moved unchanged), a health module and a memberships module exist and own what they should
- [x] `AppModule.register(rawConfig, clock, logger)` keeps its signature; `createApp` and the test harness are unchanged
- [x] No `forwardRef`, no new global module beyond the clock
- [x] All existing tests pass without edits
- [x] No new package or dependency

## Comments
