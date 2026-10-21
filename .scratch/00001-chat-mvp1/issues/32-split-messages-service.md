# 32: Split `MessagesService` and remove duplication

**What to build:** `MessagesService` (~920 lines) owns Direct sending, Group lifecycle, membership notes, summaries and push fan-out. Behaviour must not change; this is a refactor after the correctness tickets.

**Blocked by:** 26, 27, 28

**Status:** resolved

- [x] Group lifecycle (create, add, remove, leave) moves to a `GroupsService`; `GroupsController` calls it directly
- [x] The shared shape of add/remove/leave (lock, mutate membership, note, period, push) and the repeated reader/member lookups are extracted once
- [x] `RealtimeGateway` no longer builds its own `drizzle(pool)` or queries Group membership directly; it asks an injected service
- [x] Remove the `!` assertions and `as` casts that hide types (`created!`, `current!`, `raced!`, `asGroup`, `row.kind as ...`) where a typed shape can replace them; fix the wrong doc comment on `requireOwner`
- [x] Drop the duplicated Group `ConversationTarget` build and `displayName` logic in the web shell
- [x] No behaviour change: the whole existing test suite passes untouched

## Comments

- From the second code review (standards axis, judgement calls). Needs the user's approval of the refactor scope before starting.
- 2026-10-21: The user approved the refactor scope; work started.
- 2026-10-21: Done. `GroupsService` (create/add/remove/leave via one `changeMembership` shape: lock, then commit-order slot, then rule checks, as in ticket 26; slots come from the single shared `CommitOrder`, as in ticket 27) replaces the Group methods of `MessagesService` (1019 -> 366 lines). Shared modules: `conversation-rules` (reader/member/owner/closed lookups; `requireOwner` doc fixed), `ConversationQueries` (summaries, members), `message-rows` (`toMessage`, `nextSequence`, `only`), `GroupMemberships` (the gateway asks it, no own `drizzle(pool)`). `messages.kind` is typed with a drizzle `enum` option (type-only, no migration). Web: `conversation-target.ts` holds the target type, `displayName`, `groupTarget`.
- Assumptions/deferred: `all[0]!` in `summaries` (a Direct Conversation always has a Member) and `memberIds[0]!` in group-create push remain; `leave` reuses the Owner read under the lock instead of re-reading it (same transaction, same lock). `GroupsService` calls `MessagesService.get` so the existing test that spies on it still works. No test changed.
