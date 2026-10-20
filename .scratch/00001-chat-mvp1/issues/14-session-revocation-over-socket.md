# 14: Session revocation over the socket

**What to build:** When a User logs out, every live connection belonging to that session receives `session.revoked` and is disconnected, and any other tab on that session is returned to the login page.

**Blocked by:** 05, 12

**Status:** ready-for-agent

- [ ] Logout pushes `session.revoked` to the per-session room, then disconnects those sockets (tested with real clients)
- [ ] Sockets of the same User's other sessions stay connected
- [ ] A denied token cannot open a new socket
- [ ] SPA: on `session.revoked` (or an unrecoverable `401`) auth state is cleared and the User is returned to login; tested with the `RealtimeEvents` fake
