# 39: Verify what the final review could not check

**What to build:** The final review's agents could not confirm several things (shell commands failed or returned empty). Check them directly and report or fix.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Run `drizzle-kit generate` on `main` and confirm it reports no changes; migrations 0007–0012 match their snapshots (no hand edits)
- [ ] Inspect the `pnpm-lock.yaml` diff since `6649181`: the only direct dependency added is `cmdk` (transitive entries are fine); report anything else
- [ ] Read `messages.service.ts`, `conversation-rules.ts`, `conversation-queries.ts`, `realtime.gateway.ts` and the contracts diff for `!`, casts and standards issues the review skipped; list findings in Comments (fix trivial ones, ticket the rest)
- [ ] Run the full suite from a clean checkout (`pnpm lint`, `pnpm typecheck`, `pnpm test`; use `--no-file-parallelism` for the API if the sandbox kills the run) and record the counts
- [ ] Launch the app end to end (the `run` skill) and exercise: register two Users, Direct message, create a Group, add/remove/leave, reload, reconnect; record anything broken

## Comments

- From the final code review: not-verified items. No code changes expected unless something is wrong.
