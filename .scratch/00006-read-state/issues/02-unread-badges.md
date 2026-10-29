# 02: Unread badges (tracer bullet)

**What to build:** Each Conversation in the list shows its Unread Count as a badge (spec 00006, "Domain rules", "Schema", "HTTP API" and "SPA"). In this ticket, the only thing that moves a Read Marker is the Member sending a Message. Explicit mark-read comes in ticket 03. Touches the api, contracts and web packages.

**Demo:** Bob sends Alice a Message and her badge shows 1. Alice replies and her badge clears.

- **Schema.** Every current Member gets a Read Marker, as a non-null integer column on `conversation_members` with a default of 0.
  - Group creation and adding a Member set it to the new period's start sequence. A re-added Former Member starts fresh.
  - Both Users of a new Direct Conversation start at 0.
  - The migration is generated from the Drizzle schema (ADR 0003). It backfills every existing row to its Conversation's last sequence. If Drizzle Kit can't take the backfill SQL without hand-editing a generated file, stop and escalate.
- **Sending.** Sending a text Message moves the sender's own marker to it, in the send transaction. Storing a System Message moves no marker.
- **List.** Each Conversation summary gains `unreadCount`: other Members' `text` Messages after the caller's marker, capped at 100, and 0 for a Former Member and a Closed Group. It is computed in the list query, counting at most 100 rows per Conversation, and nothing is stored.
- **SPA:**
  - A badge with the count ("99+" at 100) and none at 0. A Conversation with unread Messages is emphasized.
  - Each `message.created` of kind `text` from another User adds one, unless that Conversation is open, the document is visible and the view is at the latest Message.
  - The list is refetched on reconnect.

**Allowed packages:** None

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] After the migration, every pre-existing Member's Read Marker equals its Conversation's last sequence (migration test)
- [ ] `unreadCount` counts only other Members' `text` Messages after the marker. The User's own Messages and System Messages never count.
- [ ] A new Member's count ignores everything from before they joined. A re-added Former Member's count starts fresh. The recipient of a new Direct Conversation has 1 and the sender has 0.
- [ ] Sending a Message clears the sender's own count for that Conversation
- [ ] `unreadCount` is 0 for a Former Member and a Closed Group, and is capped at 100
- [ ] The list shows the badge, "99+" at 100, and nothing at 0
- [ ] A `text` Message from someone else raises the badge of a Conversation that isn't open and at the latest Message, and doesn't raise the badge of one that is
- [ ] The list is refetched on reconnect
- [ ] The contract change has a contracts test, and no migration file was hand-edited after generation

**Verification:**
- A migration test for the backfill.
- API behaviour tests for the count rules and starting values.
- Web behaviour tests for the badge, increments and the reconnect refetch.
- A browser check of the badge at mobile and desktop widths, in light and dark themes.

**Out of scope:** The mark-read endpoint, clearing the badge by reading, and `conversation.read` (ticket 03). Read Receipts (ticket 05). Notifications, an unread total in the tab title, muting.

## Comments
