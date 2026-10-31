# Spec: Read State (Unread Counts and Read Receipts)

Status: resolved

## Problem Statement

A User with several Conversations has no way to tell which of them have Messages they have not read yet. The Conversation list shows only the latest Message and its time, so finding what is new means opening each Conversation in turn. Reading on one device leaves no trace on another. In a Direct Conversation, the sender cannot tell whether the other User has read what they wrote, so they follow up or wait without knowing. Read receipts were left out of MVP1 on purpose (MVP1 spec, Out of Scope).

## Solution

Every Member gets a **Read Marker** in each Conversation: the position up to which they have read. It lives on the server and only moves forward. From it the app derives:

- An **Unread Count** for each Conversation in the list: the number of Messages from other Members after the Read Marker. System Messages and the User's own Messages never count. It is shown as a badge, capped at "99+", and is the same on every tab and device of that User.
- A **Read Receipt** in Direct Conversations: a "Seen" mark under the newest of the sender's own Messages the other User has read. Each User can turn off sharing read receipts. The setting is reciprocal, so a User who stops sharing also stops seeing the other User's.

A Conversation counts as read when the User has it open, the tab is visible and they are at the latest Message. Scrolling back through history does not mark anything read.

Groups get Unread Counts but no Read Receipts. Former Members and readers of a Closed Group have no Unread Count.

## User Stories

### Unread Counts

1. As a User, I want each Conversation in my list to show how many Messages I have not read, so that I can see at a glance where something new is waiting.
2. As a User, I want Conversations with nothing unread to show no badge, so that the list stays calm when I am caught up.
3. As a User, I want the badge to show "99+" once there are more than 99 unread Messages, so that the list stays readable after a long absence.
4. As a User, I want my own Messages never to count as unread, so that writing in a Conversation does not create a badge for me.
5. As a User, I want sending a Message to mark everything up to it as read, so that I am not shown a badge for a discussion I just replied to.
6. As a User, I want System Messages such as "Bob was added" never to count as unread, so that membership changes do not look like new conversation.
7. As a newly added Member, I want nothing from before I joined to count as unread, so that I don't start with a badge for Messages I cannot see.
8. As a Former Member who was added back, I want my Unread Count to start fresh from the moment I was added again, so that Messages from an earlier period don't come back as unread.
9. As the recipient of a new Direct Conversation, I want its first Message to show as unread, so that I notice someone started talking to me.
10. As a Former Member, I want a Group I left or was removed from to show no badge, so that I am not nagged about a Conversation I can no longer take part in.
11. As a User, I want a Closed Group to show no badge, so that a read-only record never asks for my attention.
12. As a User, I want the badge to go up while I am using the app when a Message arrives in a Conversation I am not looking at, so that I notice new Messages without reloading.
13. As a User, I want the Unread Count I see after a reload or a reconnect to be correct, so that a dropped connection never leaves a wrong badge.

### Marking as read

14. As a User, I want opening a Conversation and reaching its latest Message to mark it as read, so that the badge clears once I have actually seen everything.
15. As a User, I want a Conversation to stay unread while I am scrolled up reading older history, so that new Messages that arrived meanwhile are not marked read before I see them.
16. As a User, I want jumping to the latest Message to mark the Conversation as read, so that catching up clears the badge.
17. As a User, I want a Conversation open in a hidden or background tab not to be marked read, so that Messages arriving while I am away stay unread.
18. As a User, I want Messages that arrive while I am at the latest Message of an open, visible Conversation to be marked read as they arrive, so that I am not shown a badge for something already on my screen.
19. As a User, I want marking as read never to move backwards, so that a slow or repeated request cannot bring back Messages I already read.
20. As a User, I want reading a Conversation on one tab or device to clear its badge on all my other tabs and devices, so that my unread state is the same everywhere.
21. As a Former Member, I want to be unable to mark a Group I no longer belong to as read, so that only Members have read state.
22. As a non-Member, I want any attempt to mark a Conversation I was never part of as read to look like the Conversation does not exist, so that its existence is not leaked.

### Read Receipts

23. As a User in a Direct Conversation, I want to see "Seen" under the newest of my Messages the other User has read, so that I know they got it.
24. As a User in a Direct Conversation, I want "Seen" to move forward while I watch as the other User reads, so that I don't have to reload to know.
25. As a User in a Direct Conversation, I want "Seen" to be right when I open the Conversation, even if I missed the live update, so that a dropped connection does not hide it.
26. As a User, I want to turn off sharing my read receipts, so that others cannot tell when I have read their Messages.
27. As a User who turned off sharing read receipts, I want to stop seeing other Users' read receipts too, so that the rule is fair for both sides.
28. As a User, I want sharing read receipts to be on by default, so that the feature works without any setup.
29. As a User who turned off read receipts, I want my Unread Counts to keep working on all my devices, so that privacy towards others does not cost me my own read state.
30. As a User, I want to change the read receipts setting in my Profile, so that I find it next to my other personal settings.
31. As a Member of a Group, I want no read receipts in Groups, so that a large Group does not expose who has read what.

### Rollout

32. As an existing User, I want everything I could already see before this feature shipped to count as read, so that I am not met with a wall of old unread Messages.

### Operator and developer

33. As an operator, I want read-state pushes logged like other pushes (event name, target User count, Conversation ID, no payload), so that I can trace them.
34. As a developer, I want the mark-read request, the new response fields and the new push events defined in contracts, so that the API and the SPA validate against the same shapes.
35. As a developer, I want the migration's backfill covered by an automated test, so that rollout behaviour is proven and not only checked by hand.

## Implementation Decisions

### Domain rules

- The **Read Marker** is a sequence position: the per-Conversation Message sequence up to which the Member has read. It is never a timestamp and never a count. It covers System Messages like any position, since they share the sequence.
- It is kept per Member per Conversation, on the server only, and only ever moves forward.
- Starting value:
  - A Member who joins a Group (at creation or by being added) starts at the start of their new membership period, so nothing from before their joining is after it. The "added" System Message that opens their period is after the marker, but System Messages never count.
  - Both Users of a new Direct Conversation start at the position before the first Message. The sender's marker then moves to their own first Message when it is sent (next rule), so the first Message is unread for the recipient only.
  - A re-added Former Member starts fresh at the start of the new period.
- Sending a text Message moves the sender's own Read Marker to that Message, in the same transaction as the send. Storing a System Message does not move anyone's marker.
- The **Unread Count** is the number of `text` Messages from other Members with a sequence after the Member's Read Marker. A current Member's marker is always at or after the start of their open period, so every such Message is inside a window they can read. No join against membership periods is needed.
- The count is capped at 100. The SPA shows 100 as "99+".
- Leaving or being removed discards the Member's Read Marker. Former Members and readers of a Closed Group have an Unread Count of 0 and cannot mark anything read.
- **Read Receipts** exist only in Direct Conversations. A receipt is the other User's Read Marker, shown to a User only when both Users share read receipts.
- **Share read receipts** is a per-User setting, on by default and reciprocal. Turning it off hides the User's marker from the other User and hides the other User's marker from them. The marker itself is still kept and still drives the User's own Unread Counts.

### Schema

- `conversation_members` (current Members only: leaving or removal deletes the row, re-adding inserts a new one) gains a non-null integer Read Marker column with a default of 0.
  - Group creation and adding a Member set it to the new period's start sequence.
  - Creating a Direct Conversation leaves it at 0 for both Users.
  - Sending a text Message raises the sender's.
  - Because the row is deleted on leave or removal, a re-added Member gets a fresh marker with no extra logic. This choice was made in the design session after checking the leave and remove paths.
- `users` gains a non-null boolean "share read receipts" column with a default of true (ADR 0005).
- The migration that adds the Read Marker backfills every existing `conversation_members` row to its Conversation's current last sequence. Existing Members start with nothing unread, and new rows follow the starting-value rules.
- The Drizzle schema is the source of truth. The migration is generated with `pnpm db:generate` (ADR 0003). The backfill statement is the one addition the generated migration needs, and it should be written so the generator's workflow allows it (for example as a custom migration Drizzle Kit generates for hand-written SQL). The implementer confirms which way Drizzle Kit supports this, and escalates if the only way is hand-editing a generated file.

### HTTP API

All routes are under `/api/v1`, as today.

- **Mark as read**: `PUT /conversations/:id/read` with body `{ upToSequence }` (a non-negative integer).
  - The request is idempotent and forward-only. The new marker is the largest of the current marker and `upToSequence`, clamped to the Conversation's last sequence. A value at or below the current marker changes nothing. A value above the last sequence is clamped, not rejected.
  - Response `200` with `{ upToSequence }`, the marker after the request.
  - Implemented as one conditional update of the caller's `conversation_members` row. It takes no Conversation row lock and does not go through the commit-order serializer, because it touches no Message and no other Member. If a concurrent removal commits first, the update matches no row.
  - Errors: a never-Member gets `404 CONVERSATION_NOT_FOUND`, and a Former Member (including every reader of a Closed Group) gets `403 NOT_A_MEMBER`, both as today.
  - Rate limit: the generic 120 / min / User. The SPA debounces its calls.
- **Conversation list**: each summary gains `unreadCount`, an integer from 0 to 100, and 0 for a Former Member. It is computed in the list query from the caller's Read Marker, counting at most 100 rows per Conversation. The list is the source of truth for the count. No count is stored.
- **One Conversation** (`GET /conversations/:id`): a Direct Conversation gains `readUpToSequence`, the other User's Read Marker. It is present only when both Users share read receipts and omitted otherwise. Groups never carry it.
- **Current User**: the profile response gains `shareReadReceipts`, and `PATCH /users/me` accepts it alongside the Nickname. Changing it pushes nothing (as in MVP1, there is no `user.updated`) and takes effect for the other User on their next fetch.

### Real-time push

ADR 0009 applies: the Read Marker is durable state, persisted by an HTTP write and then pushed.

- `conversation.read` with payload `{ conversationId, upToSequence }`. It goes to the reader's own `user:<id>` room after every mark-read that moved the marker, and after a send that moved the sender's marker. It syncs the User's other tabs and devices.
- `conversation.receipt` with payload `{ conversationId, upToSequence }`. It goes to the other User's `user:<id>` room in a Direct Conversation, only when both Users share read receipts and the marker moved. The server decides at send time, so a User who doesn't share never causes one and never receives one.
- Neither event carries a `userId`, because the room already identifies who it is for. Each event has one meaning.
- Both are best-effort, like every push. A missed `conversation.read` is repaired by the next list fetch, and a missed `conversation.receipt` by the next `GET /conversations/:id`.
- Logged like other pushes: event name, target User count, Conversation ID, and no payload.

### Contracts

- A mark-read request schema and a response schema.
- `unreadCount` on the Conversation summary, `readUpToSequence` (optional) on the Direct Conversation detail, and `shareReadReceipts` on the profile and the profile update.
- The `conversation.read` and `conversation.receipt` events in the event catalogue.

### SPA

- **Badge.** The Conversation list shows a badge with `unreadCount` (or "99+"), and nothing at 0. A Conversation with unread Messages is visually emphasized.
- **When to send mark-read.** The SPA sends it with the highest sequence on screen when all three hold:
  - the Conversation is open;
  - the document is visible;
  - the view is at the latest Message (the live edge of the message list, which includes jumping to latest).

  Calls are debounced. A Message that arrives while the view is at the live edge of an open, visible Conversation is marked read through the same path.
- **Local increments.** Between list fetches, the SPA adds one to a Conversation's count for each `message.created` of kind `text` from another User, unless that Conversation is open, visible and at the live edge.
- **On `conversation.read`.** If `upToSequence` is at or after the newest sequence the SPA knows for that Conversation, it sets the count to 0. Otherwise it refetches the Conversation list.
- **On reconnect.** The SPA refetches the Conversation list, so counts are correct after a gap.
- **Read Receipt.** In a Direct Conversation, "Seen" is shown under the newest of the User's own Messages whose sequence is at or before the other User's marker. The marker comes from `readUpToSequence` when the Conversation is opened and from `conversation.receipt` events after that. With no marker known, nothing is shown.
- **Setting.** The Profile dialog gains a "Share read receipts" switch.
- Components follow the existing shadcn conventions of the web package.

## Testing Decisions

- **Good tests check external behaviour only.** They drive the system through its public seam and assert on what a client or user can observe: status codes, `ErrorCode`s, response bodies validated against contracts, pushed events, rendered UI. They never reach into services, repositories or component internals. This matches the testing policy and the MVP1 spec.
- **Seams:**
  1. **API behaviour test** (existing; prior art: the Groups and history-window tests and the app harness). It covers:
     - the mark-read semantics: forward-only, idempotent, clamped, the marker returned;
     - `403` for a Former Member and a Closed Group, and `404` for a never-Member;
     - the Unread Count rules: only others' `text` Messages; the starting value at Group creation, on add and on a re-add after leaving; an implicit Direct Conversation counting its first Message for the recipient only; sending moving your own marker; the cap at 100; 0 for a Former Member;
     - `conversation.read` to every socket of the reader, and not to the other User;
     - `conversation.receipt` to the other User only when both share receipts, and never in Groups;
     - `readUpToSequence` present or omitted per the setting;
     - `shareReadReceipts` through the profile endpoints.
  2. **Migration test** (new; the only new seam). A test gets its own fresh database in the run's Testcontainers Postgres, applies migrations up to the one just before the Read Marker migration, seeds rows with plain SQL (Users, Conversations with a last sequence, Members), applies the remaining migrations, and asserts the backfilled Read Markers equal each Conversation's last sequence. Build it as a small reusable helper ("migrate up to a named migration, seed, migrate the rest") so later data migrations can use it. Adding it means adding a "Migration test" kind to the testing policy in the same PR (an Intent Doc, ADR 0008).
  3. **Web behaviour test** (existing; prior art: the login test, MSW and the fake realtime). It covers:
     - the badge and "99+";
     - local increments from `message.created`, and none for the open, at-latest Conversation;
     - mark-read sent only when open, visible and at the latest Message, and not while scrolled up;
     - `conversation.read` clearing the badge;
     - the list refetch on reconnect;
     - "Seen" placed from `readUpToSequence` and moved by `conversation.receipt`;
     - the Profile switch.

     Page visibility is driven through the document's visibility state and `visibilitychange`, not by mocking our own code.
  4. **Contracts test** (existing; prior art: the group and realtime contract tests). It covers the new request, response and event schemas.
- Strict test-first with the `tdd` skill, one behaviour at a time.

## Out of Scope

- Read Receipts in Groups (per-Message reader lists, "seen by N").
- Pushing changes to the read receipts setting in real time.
- A stored Unread Count. See "Stored Unread Count" in `docs/laters.md` for when to revisit.
- Keeping a Read Marker for Former Members.
- Marking as unread, or moving the Read Marker backwards.
- Per-Conversation muting, notification sounds, browser or OS notifications, and an unread total in the tab title or favicon.
- Typing Indicators and Presence (spec 00007 covers typing; Presence is a later slice).
- Horizontal scaling (ADR 0006).

## Further Notes

- Domain terms: Read Marker, Unread Count and Read Receipt are defined in `GLOSSARY.md`. Use them in code, tests and issues.
- ADR 0009 sets the pattern: client signals are HTTP writes with a socket push, and the Read Marker is the durable kind. It extends ADR 0001.
- Two decisions sharpened while writing this spec:
  - On `conversation.read` the SPA sets the count to 0 only when the new marker covers everything it knows, and refetches the list otherwise, because the event carries a position, not a count.
  - Group creation sets each initial Member's marker to their period's start. At creation that is the Conversation's start, since creating a Group writes no System Messages.
- The schema change and the new routes change the Generated Docs (ER diagram, HTTP routes). Regenerate them per the definition of done.
- Tickets (in `issues/`), each a PR:
  1. Migration-test seam (prefactor).
  2. Unread badges: the Read Marker with backfill, sends moving the sender's marker, `unreadCount`, the badge, increments and the reconnect refetch.
  3. Mark as read: the endpoint, the SPA mark-read conditions and `conversation.read`.
  4. The share read receipts setting.
  5. Read Receipts in Direct Conversations.
