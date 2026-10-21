# 43: Test that a Former Member's sidebar entry flips to closed

**What to build:** Ticket 38 requires a Former Member's open view *and* sidebar entry to flip to closed on `group.closed`. The new SPA test only asserts the open view.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] SPA test with the `RealtimeEvents` fake: a Former Member receives `group.closed` and the sidebar entry shows closed without a reload
- [ ] If the sidebar does not flip, fix it (ask before any behaviour change beyond that)

## Comments

- From the final code review of tickets 38-40 (spec axis). The SPA likely already handles it; this is missing evidence.
