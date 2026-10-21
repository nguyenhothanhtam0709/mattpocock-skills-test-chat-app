# 32: Split `MessagesService` and remove duplication

**What to build:** `MessagesService` (~920 lines) owns Direct sending, Group lifecycle, membership notes, summaries and push fan-out. Behaviour must not change; this is a refactor after the correctness tickets.

**Blocked by:** 26, 27, 28

**Status:** ready-for-agent

- [ ] Group lifecycle (create, add, remove, leave) moves to a `GroupsService`; `GroupsController` calls it directly
- [ ] The shared shape of add/remove/leave (lock, mutate membership, note, period, push) and the repeated reader/member lookups are extracted once
- [ ] `RealtimeGateway` no longer builds its own `drizzle(pool)` or queries Group membership directly; it asks an injected service
- [ ] Remove the `!` assertions and `as` casts that hide types (`created!`, `current!`, `raced!`, `asGroup`, `row.kind as ...`) where a typed shape can replace them; fix the wrong doc comment on `requireOwner`
- [ ] Drop the duplicated Group `ConversationTarget` build and `displayName` logic in the web shell
- [ ] No behaviour change: the whole existing test suite passes untouched

## Comments

- From the second code review (standards axis, judgement calls). Needs the user's approval of the refactor scope before starting.
