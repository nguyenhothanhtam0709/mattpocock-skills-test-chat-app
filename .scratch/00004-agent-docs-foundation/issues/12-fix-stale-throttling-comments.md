# 12: Fix stale throttling comments

**What to build:** Two doc comments say the rate limits live in `AppModule`, but they are in `ThrottlingModule`: `packages/api/src/auth/auth.controller.ts:49` (login) and `packages/api/src/auth/users.controller.ts:25` (user search). Change both to say `ThrottlingModule`. Comments only, no behaviour change. Found while extracting conventions in ticket 05.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Neither comment mentions `AppModule`; both name `ThrottlingModule`
- [ ] No code other than the two comments changes
- [ ] `pnpm lint` passes

## Comments
