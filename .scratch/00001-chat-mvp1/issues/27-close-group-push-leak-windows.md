# 27: Close the Group push leak windows

**What to build:** Sockets can receive Group pushes outside a User's membership: a removed Member can still get one more push, and a socket connecting during a removal can join the room after it was told to leave. Make room membership agree with the database.

**Blocked by:** 26

**Status:** ready-for-agent

- [ ] A removed or departed User's sockets stop receiving a Group's pushes from the moment the change commits; a Message sent concurrently with removal is not delivered to them (test with real clients)
- [ ] A just-added User's sockets join the room before pushes that follow the commit, or the User still receives them (no missed push in the gap)
- [ ] The handshake reads Group rooms and joins them without a window where a concurrent removal is lost (e.g. join, then re-check against the database, and leave if no longer a Member)
- [ ] Ticket 23's "known gap" is removed from its comments

## Comments

- From the second code review (spec axis, findings 2 and 3). Spec story 44; ADR 0001 keeps push best-effort, but the leak is a visibility problem, not a missed delivery.
