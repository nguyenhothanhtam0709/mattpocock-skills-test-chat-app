# 18: Leave a Group, Owner transfer, and Closed Group

**What to build:** Any Member can leave a Group after confirming. If the Owner leaves, ownership passes to the longest-standing Member and everyone is told. If the last Member leaves, the Group becomes a Closed Group: a read-only record that no one can post to or join.

**Blocked by:** 17

**Status:** resolved

- [x] Leave endpoint for any Member; the leaver becomes a Former Member (their period ends)
- [x] Owner leaving transfers ownership to the Member with the longest current period; `group.owner_changed` pushed
- [x] `group.member_left` pushed to remaining Members and shown as a `Marker` note
- [x] Last Member leaving closes the Group permanently; `group.closed` pushed; sending or adding to a Closed Group returns `GROUP_CLOSED`
- [x] Former Members can still read their windows of a Closed Group
- [x] SPA: Leave action in the Group details `Sheet` with `AlertDialog` confirmation; Owner badge updates on transfer; Closed Group view is read-only; tested

## Comments

- No package was added and no migration was needed: a Closed Group is a Group with no row left in `conversation_members` (no new column, so nothing nullable); the leaver's period ends as in ticket 16 and ownership lives in the existing `groups.owner_id`.
- Endpoint (the ticket named none): `POST /groups/:id/leave`, no body, `200` with the updated Group (`members` is `[]` when it just closed). Unknown Group, Direct Conversation or never-Member: `404 CONVERSATION_NOT_FOUND`; a Former Member leaving again: `403 NOT_A_MEMBER`.
- Guess: `GROUP_CLOSED` answers `409`. It is checked once the caller is known to be a reader (never-Members still get `404`), for sending, adding/removing Members and leaving. Former Members keep reading their windows.
- Guess: "longest current period" = the open period with the earliest `created_at` (ties, e.g. a Group created with several Members, go to the lowest User ID). A Former Member who was added back ranks by their newest period. In a Closed Group `groups.owner_id` keeps the last Owner (the column is not nullable) and carries no meaning.
- Push: `group.member_left` `{ conversationId, member }` and `group.owner_changed` `{ conversationId, ownerId }` go to the remaining Members only (the leaver gets neither, as for removals in ticket 16); `group.closed` `{ conversationId }` goes to the last Member who left, so their other tabs turn read-only. Pushes are best-effort.
- SPA: Leave is in the Group details `Sheet` (`AlertDialog` confirmation); the view turns read-only with a "closed" or "no longer a member" notice. The "X left" `Marker` note is, like the other membership notes, not stored in history. The leaver's view and Conversation list refresh from the response; a `group.closed` push reloads the list.
