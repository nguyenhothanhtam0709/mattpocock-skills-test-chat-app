# 27: Close the Group push leak windows

**What to build:** Sockets can receive Group pushes outside a User's membership: a removed Member can still get one more push, and a socket connecting during a removal can join the room after it was told to leave. Make room membership agree with the database.

**Blocked by:** 26

**Status:** resolved

- [x] A removed or departed User's sockets stop receiving a Group's pushes from the moment the change commits; a Message sent concurrently with removal is not delivered to them (test with real clients)
- [x] A just-added User's sockets join the room before pushes that follow the commit, or the User still receives them (no missed push in the gap)
- [x] The handshake reads Group rooms and joins them without a window where a concurrent removal is lost (e.g. join, then re-check against the database, and leave if no longer a Member)
- [x] Ticket 23's "known gap" is removed from its comments

## Comments

- From the second code review (spec axis, findings 2 and 3). Spec story 44; ADR 0001 keeps push best-effort, but the leak is a visibility problem, not a missed delivery.
- Room changes and pushes are now ordered per Conversation inside this process: `send`, `addGroupMember`, `removeGroupMember` and `leaveGroup` take a slot in a `KeyedSerializer` (in `realtime/`) right after the Conversation lock, and run their room changes and pushes once earlier slots have finished, i.e. in commit order (nothing waits for a slot while holding the lock). A Message cannot be pushed between a membership commit and its room change; one sent after a removal is never pushed to the removed User, and one sent after an add reaches the added User.
- Handshake: the Group rooms are read in the middleware as before, joined in `handleConnection` together with the User room, then read again; rooms the User no longer belongs to are left and new ones joined.
- Guess: the serialiser is in-process, which is enough while the app is a single instance (Socket.IO rooms are in-memory too); a scale-out would need a cross-instance answer anyway. Residual: a User removed and re-added within the few milliseconds of one handshake could have the recheck undo the re-join; not handled.
- The "removed while sending" test passes on the old code too (the old window is a few microtasks wide and cannot be forced); the handshake and slow-add tests failed before the change.
- No package added, no migration.
