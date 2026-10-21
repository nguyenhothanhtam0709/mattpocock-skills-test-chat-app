# 40: Bring the spec in line with the final behaviour

**What to build:** The spec still lacks several things that shipped or were decided after ticket 30. Update it (the user asked that the spec NOT be modified until this ticket is picked up).

**Blocked by:** 33, 38

**Status:** ready-for-agent

- [ ] Error list includes `OWNER_CANNOT_BE_REMOVED`, and the spec states the HTTP status of each domain code as implemented (e.g. `GROUP_FULL`, `ALREADY_A_MEMBER`, `GROUP_CLOSED`, `OWNER_CANNOT_BE_REMOVED` → 409; `USER_NOT_FOUND` → 404; `NOT_A_MEMBER` → 403)
- [ ] Group endpoints are listed with paths and response shapes (`POST /groups`, `POST /groups/:id/members`, `DELETE /groups/:id/members/:userId`, `POST /groups/:id/leave`)
- [ ] "Get one Conversation" states: `closed` flag, caller's `isMember` (ticket 33), and that a Former Member gets `members: []` with `ownerId` omitted (ticket 29)
- [ ] `group.closed` is described as also reaching Former Members through their per-User rooms (ticket 38)
- [ ] Concurrency rules: lock-then-check under the Conversation lock (ticket 26) and commit-ordered pushes (ticket 27), single process only
- [ ] Glossary term "System Message" is used in the spec where it says "note" (after ticket 35)
- [ ] Docs only; no code or package changes

## Comments

- Requested by the user: do not edit the spec before this ticket is worked.
