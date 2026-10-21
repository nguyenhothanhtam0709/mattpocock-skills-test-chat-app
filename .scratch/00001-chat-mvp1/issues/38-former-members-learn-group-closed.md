# 38: Former Members learn that a Group closed

**What to build:** When the last Member leaves, `group.closed` is pushed only to the leaver. Former Members who left or were removed earlier keep `closed: false` in their open view and sidebar until a reload or reconnect.

**Blocked by:** 33

**Status:** resolved

- [x] When a Group closes, `group.closed` is also pushed to every Former Member through their per-User rooms (they are no longer in the Group room); Former Members are found from `membership_periods`, bounded by the 256-Member cap
- [x] The push carries no Member list or other data a Former Member must not see (ticket 29)
- [x] SPA: a Former Member's open view and sidebar entry flip to closed without a reload (SPA test with the `RealtimeEvents` fake)
- [x] Real-client API test: removed User receives `group.closed` after the last Member leaves

## Comments

- From the final code review (spec axis, item 4). Earlier reported as "accepted"; the user asked for it to be fixed. Pushing to per-User rooms avoids needing a Group room for people who are no longer in it.
- `leave` collects every User with a `membership_periods` row for the Group (distinct, so at most 256) in the closing transaction and pushes `group.closed` to their per-User rooms; the payload is still only `{ conversationId }`. The leaver is among them, so they still get it once.
- The SPA already flipped an open view and the sidebar on `group.closed`; added a test for the Former Member case (no code change needed). No package or migration change.
