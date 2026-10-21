# 49: `pnpm db:seed` script for local development

**What to build:** There is no way to fill a local database with Users, Conversations and messages. Registration is rate limited to 5 per hour per IP, so seeding through the API caps at 5 Users and cannot create history. Add a seed script for local dev.

**Blocked by:** none

**Status:** ready-for-agent

Defaults chosen because the request did not specify them (change in Comments if wrong): 5 Users `alice`, `bob`, `carol`, `dave`, `erin` (emails `<username>@example.com`), shared password `password123`.

- [ ] `pnpm db:seed` (root script, delegating to `@chat/api`) seeds the local Postgres using the same pattern as `db:migrate` (compile, then run `dist/...` with `--env-file-if-exists=.env`); no new package or dependency
- [ ] Seeds the 5 Users with real argon2id hashes (reusing the API's hashing settings, not a copy-pasted hash), so they can log in through the SPA
- [ ] Seeds a Direct Conversation with messages, and a Group (alice Owner, bob and carol Members, dave a Former Member, with membership periods, System Messages and messages matching the rules in the spec), so the Former Member and history-window views have data
- [ ] Goes through the Drizzle schema; ids and timestamps are DB-generated (ADR 0004), no hand-written SQL migrations, no schema change
- [ ] Idempotent: running it twice does not fail or duplicate (skip or reset the seeded rows; say which in Comments)
- [ ] Refuses to run when `NODE_ENV=production`
- [ ] README gets a one-line mention under the local-dev commands
- [ ] Test (API test harness) that the seed runs and the seeded Users can log in
- [ ] Lint, typecheck and tests pass

## Comments

- Requested by the user after setting up the backend locally. They chose a committed script (not a throwaway one), which is why this ticket exists.
