# 39: Verify what the final review could not check

**What to build:** The final review's agents could not confirm several things (shell commands failed or returned empty). Check them directly and report or fix.

**Blocked by:** none

**Status:** resolved

- [x] Run `drizzle-kit generate` on `main` and confirm it reports no changes; migrations 0007–0012 match their snapshots (no hand edits)
- [x] Inspect the `pnpm-lock.yaml` diff since `6649181`: the only direct dependency added is `cmdk` (transitive entries are fine); report anything else
- [x] Read `messages.service.ts`, `conversation-rules.ts`, `conversation-queries.ts`, `realtime.gateway.ts` and the contracts diff for `!`, casts and standards issues the review skipped; list findings in Comments (fix trivial ones, ticket the rest)
- [x] Run the full suite from a clean checkout (`pnpm lint`, `pnpm typecheck`, `pnpm test`; use `--no-file-parallelism` for the API if the sandbox kills the run) and record the counts
- [x] Launch the app end to end (the `run` skill) and exercise: register two Users, Direct message, create a Group, add/remove/leave, reload, reconnect; record anything broken

## Comments

- From the final code review: not-verified items. No code changes expected unless something is wrong.

- Findings (agent, branch `agent/39-verify-unchecked-review-areas`):
  1. `drizzle-kit generate` on `main`: "No schema changes, nothing to migrate". Migrations 0000-0013 each have a snapshot and a journal entry; nothing hand-edited, nothing generated.
  2. `pnpm-lock.yaml` diff since `6649181` (one commit, 8a810b5, #34): the only importer change is `cmdk ^1.1.1` under `packages/web`; the rest is 432 added transitive entries (`@radix-ui/*`, etc.), no removals. Matches the single `package.json` change. Nothing else added.
  3. Code read (`messages.service.ts`, `conversation-rules.ts`, `conversation-queries.ts`, `realtime.gateway.ts`, contracts):
     - Fixed (no behaviour change): `all[0]!` in `conversation-queries.ts` (now guarded); `codePointAt(0)!` in `contracts/message.ts` and `contracts/user.ts` (now `?? 0`); a mis-wrapped doc comment in `conversation-rules.ts`; a stale comment on `MessageCreatedEventSchema` (said "User room"; Groups push to the Group room).
     - Left as is, judged acceptable: `server!: Server` (Nest `@WebSocketServer` idiom); `socket.data as {...}` and `handshake.auth as {...}` casts in `realtime.gateway.ts` (socket.io types are not a direct dependency, see `socket-types.ts`).
     - Minor, not ticketed: `MessagesService.pushCreated` destructures `[conversation]` from `summaries()` without a check; it cannot be empty for a just-created Direct whose recipient has a membership period, and the push payload is `unknown`-typed, so a failure would only be logged. `send()` has a redundant `const message = ...; return message`.
  4. Suite on a clean checkout of `main` plus these fixes: `pnpm lint` clean; `pnpm typecheck` clean; tests contracts 138, API 240 (25 files), web 113 (17 files), all passing (run per package with `NODE_OPTIONS=--max-old-space-size=1024`, parallel files worked).
  5. End to end (API plus Socket.IO with the real msgpack/websocket setup against a fresh Postgres, scripted; the browser UI was not driven): registered and logged in three Users; Direct message (conversation.created, message.created to both, resend idempotent 201 then 200, self-message 400); create Group; Member posts; Owner adds a Member (live room join, new Member posts at once); non-Owner add 403; Owner removes (membership_ended, no later pushes, post 403, history only within their window, `isMember: false` with no Members); Owner leaves (ownership passes, reload shows the new Owner, System Messages in history); socket reconnect receives Group pushes; last Member leaves (Group closed, `group.closed`, post 409, list shows `closed`); logout revokes the socket. All checks passed. Note: bodyless requests sent with `content-type: application/json` get 400 `VALIDATION_FAILED`; the web client never does that.
