# 38: Former Members learn that a Group closed

**What to build:** When the last Member leaves, `group.closed` is pushed only to the leaver. Former Members who left or were removed earlier keep `closed: false` in their open view and sidebar until a reload or reconnect.

**Blocked by:** 33

**Status:** ready-for-agent

- [ ] When a Group closes, `group.closed` is also pushed to every Former Member through their per-User rooms (they are no longer in the Group room); Former Members are found from `membership_periods`, bounded by the 256-Member cap
- [ ] The push carries no Member list or other data a Former Member must not see (ticket 29)
- [ ] SPA: a Former Member's open view and sidebar entry flip to closed without a reload (SPA test with the `RealtimeEvents` fake)
- [ ] Real-client API test: removed User receives `group.closed` after the last Member leaves

## Comments

- From the final code review (spec axis, item 4). Earlier reported as "accepted"; the user asked for it to be fixed. Pushing to per-User rooms avoids needing a Group room for people who are no longer in it.
