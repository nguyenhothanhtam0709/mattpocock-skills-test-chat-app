# 02: Auth and realtime modules

**What to build:** Auth and realtime are separate modules that no longer depend on each other in a circle. The auth providers (auth service, token service, access-token authenticator, auth guard, token deny list) form one module. The auth and users controllers live in a second module that imports auth and realtime. The realtime module imports auth and memberships. Registration, login, logout (including revoking the session's sockets), user search and the socket handshake all work as before.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] The auth module does not import the realtime module, directly or indirectly
- [ ] The auth and users controllers are in their own module that imports auth and realtime
- [ ] The realtime module imports auth and memberships
- [ ] No `forwardRef`
- [ ] All existing tests pass without edits
- [ ] No new package or dependency

## Comments
