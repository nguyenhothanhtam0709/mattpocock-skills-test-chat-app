# 34: Make Group room joins robust

**What to build:** Two small ways a User can end up with the wrong room membership: `addMember` can fail after commit before the new Member joins the room, and `reconcileGroupRooms` can re-add a just-removed User.

**Blocked by:** none

**Status:** resolved

- [x] In `GroupsService.addMember`, the room join happens before any read that can throw (as `removeMember` and `leave` do); a failing read after commit still leaves the new Member in the room (test with an injected failure)
- [x] `reconcileGroupRooms` cannot put a removed User back in a room when a removal commits between its read and its join (join, then re-check against the database and leave if no longer a Member, under the commit-order slot if needed); real-client test without sleeps
- [x] Ticket 27's comments mention the closed gaps

## Comments

- From the final code review (spec axis, bugs 3 and 5).
- `addMember` now joins the room first, guarded like `removeMember` and `leave`, before `groupAs`; a test makes the read after the commit fail and the new Member is still in the room.
- `reconcileGroupRooms` joins the rooms the recheck read found, then reads again and leaves any it no longer finds, so a removal committing between the read and the join cannot leave the User in. The test forces that removal inside the recheck read and awaits the reconcile itself (no sleeps).
- No package added, no migration.
