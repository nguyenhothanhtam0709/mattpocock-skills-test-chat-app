# 33: `isMember` from the server so the SPA never guesses

**What to build:** `GET /conversations/:id` does not say whether the caller is a current Member, so the SPA keeps `isMember` from events and the list. A User removed or re-added while offline, or whose list entry is stale, keeps the wrong composer and Member state.

**Blocked by:** none

**Status:** resolved

- [x] `GET /conversations/:id` returns `isMember` for the caller (derived server-side, not a column); `false` for a Former Member, always `true`-or-404 semantics for Direct Conversations stay as they are
- [x] SPA `refreshGroup` takes `isMember` (and `closed`) from the response instead of keeping `current?.isMember`
- [x] `ConversationList` handles `conversation.created` for an ID already listed by replacing the entry (a re-added Former Member regains the composer without a reload)
- [x] Tests: removed while disconnected then reconnect shows read-only with no Member count; re-added while offline regains the composer; re-add push replaces a stale sidebar entry

## Comments

- From the final code review (spec axis, bugs 1 and 2). Spec: "re-synced on reconnect" (ticket 28), Former Member view (ticket 29).
- `GET /conversations/:id` adds `isMember` to the Group variant only (Direct Conversations unchanged); the create/membership responses keep `Group`. `refreshGroup` now takes `isMember` and `closed` from the response, so the optimistic updates are corrected by the server's answer.
- `conversation.created` for a listed ID now replaces the entry (moved to the top).
- Tests that mocked `GET /conversations/:id` after a membership event now make the mock reflect the changed membership.
- No package added, no migration.
