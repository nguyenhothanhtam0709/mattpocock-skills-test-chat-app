# 23: Removed Members stop receiving Group pushes at the socket level

**What to build:** When a Member is removed (or leaves), their sockets no longer receive that Group's realtime events, and their other tabs learn they are no longer a Member without a reload.

**Blocked by:** none

**Status:** resolved

- [x] Group pushes go through a per-Conversation Socket.IO room that Members' sockets join; a removed User's sockets are taken out of it (and are not re-joined on reconnect) — tested with real clients
- [x] A removed User's sockets still get a single event telling them the membership ended, so `isMember` flips on every tab without a reload (SPA test with the `RealtimeEvents` fake)
- [x] Re-adding a Former Member re-joins their sockets to the room
- [x] Existing push tests (tickets 15–18) pass

## Comments

- The user said "removed member will not join the socket.io room". Interpretation: removed Members' sockets are not in the Group's room. The agent that wrote this ticket added the single "membership ended" event so the sidebar stays correct; drop it if the user disagrees.
- No package was added and no migration was needed.
- Room: `conversation:<id>` for Groups only; Direct Conversations keep pushing to the two Users' rooms. Sockets get their Group rooms in the handshake (a DB read of their current Group memberships), so reconnects of a removed User do not re-join; add/remove/leave call `socketsJoin` / `socketsLeave` on the User's room. Group `message.created`, `group.member_added/_removed/_left` and `group.owner_changed` now go through the room. `conversation.created`, `group.closed` and the new event still go to User rooms.
- Event: new `group.membership_ended` `{ conversationId }` (the ticket named none), sent to a removed User and to a leaver. Guess: the last Member whose leaving closes the Group gets only `group.closed` (it already makes their other tabs read-only), so every socket gets a single event.
- Two existing assertions changed (tickets 16 and 18 said the removed User and the leaver receive nothing): they now expect exactly `['group.membership_ended']`. Other push tests are untouched and pass.
- SPA: the open view turns read-only ("no longer a member"), the details sheet drops Leave, and the Conversation list reloads so `isMember` flips.
- Known gap (best-effort, ADR-0001): a socket whose handshake read the Group list just before a concurrent removal commits could keep the room until it reconnects.
