# 43: Test that a Former Member's sidebar entry flips to closed

**What to build:** Ticket 38 requires a Former Member's open view *and* sidebar entry to flip to closed on `group.closed`. The new SPA test only asserts the open view.

**Blocked by:** none

**Status:** resolved

- [x] SPA test with the `RealtimeEvents` fake: a Former Member receives `group.closed` and the sidebar entry shows closed without a reload
- [x] If the sidebar does not flip, fix it (ask before any behaviour change beyond that)

## Comments

- From the final code review of tickets 38-40 (spec axis). The SPA likely already handles it; this is missing evidence.
- Resolved. The sidebar already flipped; no code change. Added a test in `packages/web/src/closed-and-member-count.test.tsx`. The sidebar has no visible closed marker, so the test observes the entry through what opening it shows. The Group's own endpoint never answers, so only the list entry can supply the closed state. I confirmed the test fails when the list stops reloading on `group.closed`.
- Assumption (flagged): "sidebar entry shows closed" is read as "the entry carries `closed`, so opening it shows the closed view". Adding a visible closed badge to the entry would be a behaviour change the ticket does not ask for.
- No package or migration change.
