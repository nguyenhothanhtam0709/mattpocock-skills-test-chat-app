# 47: Group header member count does not update live for non-acting Members

**What to build:** Found in ticket 45. When another User adds or removes a Member, a non-acting Member's Group header count stays stale (showed 2 when it should be 3, then 2 when it should be 1). The details panel shows the right count.

**Blocked by:** none

**Status:** resolved

- [x] Find why the header count differs from the details panel after `group.member_added` / `group.member_removed` / `group.member_left` events for a Member who did not cause the change
- [x] Header count and details panel agree after each event without a reload (SPA test with the `RealtimeEvents` fake)
- [x] No package changes

## Comments

- From ticket 45's walkthrough. Related: ticket 28 (closed flag and member count).
- Root cause (two parts, both in `ConversationView`):
  1. Opened-after-change: the Conversation list is not told of Member changes while a Group is not open, so a Group opened afterwards started from a stale snapshot and nothing refetched. PR #71 fixed this with one extra `GET /conversations/:id` (getGroup) request when a Group view opens (and the existing refetch on each member event and reconnect).
  2. Stale-snapshot ordering race (found in review, confirmed by a test): the list-snapshot effect replaced `info` whenever the list's count changed. A list reload requested before a Member change but answered after a newer getGroup answer overwrote the newer count with the older one. Fixed: once the Group's own endpoint has answered, list snapshots no longer replace `info` (they still seed it before that). Test: "is not overwritten by a list answer that predates a newer Group answer" (red before, green after).
- The live case (non-acting Member with the Group OPEN while others add/remove Members) could not be reproduced as a plain failure: with the `RealtimeEvents` fake, header and details panel agree after added/removed/left (test already present). On the real stack (Postgres, API, Vite dev, isolated browser session as a non-acting Member, another User adding/removing via HTTP) the header went 2 -> 3 -> 4 -> 2 correctly, matching the server. So the original report is explained by cause 1 and possibly the race in 2 (not observed live); the original run pre-dates PR #71 and was not replayed on that older code.
- No package changes.
