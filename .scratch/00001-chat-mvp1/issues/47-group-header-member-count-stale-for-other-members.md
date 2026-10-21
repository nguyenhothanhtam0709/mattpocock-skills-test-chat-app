# 47: Group header member count does not update live for non-acting Members

**What to build:** Found in ticket 45. When another User adds or removes a Member, a non-acting Member's Group header count stays stale (showed 2 when it should be 3, then 2 when it should be 1). The details panel shows the right count.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Find why the header count differs from the details panel after `group.member_added` / `group.member_removed` / `group.member_left` events for a Member who did not cause the change
- [ ] Header count and details panel agree after each event without a reload (SPA test with the `RealtimeEvents` fake)
- [ ] No package changes

## Comments

- From ticket 45's walkthrough. Related: ticket 28 (closed flag and member count).
