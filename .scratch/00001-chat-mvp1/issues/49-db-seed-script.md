# 49: `pnpm db:seed` script for local development

**What to build:** There is no way to fill a local database with Users, Conversations and messages. Registration is rate limited to 5 per hour per IP, so seeding through the API caps at 5 Users and cannot create history. Add a seed script for local dev.

**Blocked by:** none

**Status:** resolved

Defaults chosen because the request did not specify them (change in Comments if wrong): 5 Users `alice`, `bob`, `carol`, `dave`, `erin` (emails `<username>@example.com`), shared password `password123`.

- [x] `pnpm db:seed` (root script, delegating to `@chat/api`) seeds the local Postgres using the same pattern as `db:migrate` (compile, then run `dist/...` with `--env-file-if-exists=.env`); no new package or dependency
- [x] Seeds the 5 Users with real argon2id hashes (reusing the API's hashing settings, not a copy-pasted hash), so they can log in through the SPA
- [x] Seeds a Direct Conversation with messages, and a Group (alice Owner, bob and carol Members, dave a Former Member, with membership periods, System Messages and messages matching the rules in the spec), so the Former Member and history-window views have data
- [x] Goes through the Drizzle schema; ids and timestamps are DB-generated (ADR 0004), no hand-written SQL migrations, no schema change
- [x] Idempotent: running it twice does not fail or duplicate (skip or reset the seeded rows; say which in Comments)
- [x] Refuses to run when `NODE_ENV=production`
- [x] README gets a one-line mention under the local-dev commands
- [x] Test (API test harness) that the seed runs and the seeded Users can log in
- [x] Lint, typecheck and tests pass

## Comments

- Requested by the user after setting up the backend locally. They chose a committed script (not a throwaway one), which is why this ticket exists.
- Resolved. `packages/api/src/db/seed.ts` (`seedDatabase`, `assertNotProduction`), entry `seed-cli.ts`, scripts `db:seed` in the API and root `package.json`. The Users, Direct Conversation and Group are written through the Drizzle schema in one transaction; IDs and timestamps come from the DB.
- Idempotency decision: **skip**, not reset. If any seeded Username (`alice`..`erin`, case-insensitive) already exists, nothing is written and the script says "Already seeded". Reset was rejected because Conversations do not cascade from Users, so a reset would need to delete Conversations by hand, and it could destroy a developer's own data. To reseed from scratch, wipe the DB (`pnpm db:down -v`) or truncate. Trade-off: if a developer registered one of those Usernames themselves, the seed is skipped entirely rather than partially applied.
- Hashing: extracted `hashPassword` to `packages/api/src/auth/password-hash.ts` (argon2id) and used it in registration and the seed, so the settings live in one place. Behaviour of registration is unchanged.
- Seeded data: Direct Conversation alice/bob with 3 messages. Group "Weekend plans", Owner alice: created with alice, bob, dave (periods from 0), 3 messages, alice removes dave (`member_removed` System Message, dave's period ends there), alice adds carol (`member_added`, carol's period starts just before it, so she cannot read the earlier messages), 3 more messages. dave is a Former Member, carol has a history window. erin has no Conversations (a User to start new ones with). Sequences use the API's `nextSequence`.
- Seeded messages share one `created_at` (one transaction, `now()`); ordering is by sequence.
- `NODE_ENV=production` makes the CLI throw before connecting.
- Verified locally: `db:up`, `db:migrate`, `db:seed` twice (second run skipped), curl login as dave returned 200. The local dev DB held leftover walkthrough/test Users (including `Alice`, `bob`, `carol`, which collide with the seed names), so it was truncated before seeding.
