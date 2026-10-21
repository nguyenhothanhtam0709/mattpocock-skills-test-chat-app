# 28: Closed flag on Group and a reliable Member count

**What to build:** The spec's "Get one Conversation (Members, Owner, closed flag)" has no closed flag, and the SPA infers closed state from `memberCount + memberDelta`, which drifts.

**Blocked by:** none

**Status:** resolved

- [x] `GroupSchema` gains `closed` (derived server-side, not a nullable column) returned by `GET /conversations/:id` and the list
- [x] SPA reads `closed` instead of inferring it; a Former Member can tell open from closed
- [x] The Member count comes from the server and is re-synced on reconnect and list reload instead of `target.memberCount + memberDelta`; no double count when `group.member_added` arrives after a reload or for the added User's own view
- [x] `selfLeft` is cleared when the User is re-added
- [x] API and SPA tests cover each case

## Comments

- From the second code review (spec axis, "closed flag missing" and finding 5).
- No package was added and no migration: `closed` is derived (a Group with no rows in `conversation_members`), not a column.
- Contract: `Group` and `ConversationSummary` gained a required `closed` (always false for a Direct Conversation). Returned by `GET /conversations/:id`, the list, the create/add/remove/leave responses and `conversation.created`.
- Member count (guess): no separate `memberCount` field; the count is `members.length` from the server's Group (list or `GET /conversations/:id`). Ticket 29 (Former Members see no Member list) may need an explicit `memberCount` then.
- SPA: the `memberDelta`/`closedFlag`/`selfLeft` state is gone. The view keeps one `{ memberCount, closed, isMember }` snapshot taken from the list, replaced on every list reload, and refetched from `GET /conversations/:id` on reconnect and on every `group.member_*`, `group.membership_ended` and `group.closed` event (newest request wins). Events never add or subtract one, so no double count.
- Re-add (guess): `isMember` is tracked from events (`group.member_added` for the User sets it, `membership_ended`/`closed` clear it) and the list; `GET /conversations/:id` does not say whether the caller is a Member. A stale list answer that lands after a fresher event can still overwrite `isMember` until the next list/event.
- Existing web test fixtures now carry `closed`, and the membership-note tests change the mocked server before emitting events, since the count follows the server.
