# 23: Removed Members stop receiving Group pushes at the socket level

**What to build:** When a Member is removed (or leaves), their sockets no longer receive that Group's realtime events, and their other tabs learn they are no longer a Member without a reload.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Group pushes go through a per-Conversation Socket.IO room that Members' sockets join; a removed User's sockets are taken out of it (and are not re-joined on reconnect) — tested with real clients
- [ ] A removed User's sockets still get a single event telling them the membership ended, so `isMember` flips on every tab without a reload (SPA test with the `RealtimeEvents` fake)
- [ ] Re-adding a Former Member re-joins their sockets to the room
- [ ] Existing push tests (tickets 15–18) pass

## Comments

- The user said "removed member will not join the socket.io room". Interpretation: removed Members' sockets are not in the Group's room. The agent that wrote this ticket added the single "membership ended" event so the sidebar stays correct; drop it if the user disagrees.
