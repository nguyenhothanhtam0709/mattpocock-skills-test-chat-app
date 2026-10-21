# 40: Bring the spec in line with the final behaviour

**What to build:** The spec still lacks several things that shipped or were decided after ticket 30. Update it (the user asked that the spec NOT be modified until this ticket is picked up).

**Blocked by:** 33, 38

**Status:** resolved

- [x] Error list includes `OWNER_CANNOT_BE_REMOVED`, and the spec states the HTTP status of each domain code as implemented (e.g. `GROUP_FULL`, `ALREADY_A_MEMBER`, `GROUP_CLOSED`, `OWNER_CANNOT_BE_REMOVED` → 409; `USER_NOT_FOUND` → 404; `NOT_A_MEMBER` → 403)
- [x] Group endpoints are listed with paths and response shapes (`POST /groups`, `POST /groups/:id/members`, `DELETE /groups/:id/members/:userId`, `POST /groups/:id/leave`)
- [x] "Get one Conversation" states: `closed` flag, caller's `isMember` (ticket 33), and that a Former Member gets `members: []` with `ownerId` omitted (ticket 29)
- [x] `group.closed` is described as also reaching Former Members through their per-User rooms (ticket 38)
- [x] Concurrency rules: lock-then-check under the Conversation lock (ticket 26) and commit-ordered pushes (ticket 27), single process only
- [x] Glossary term "System Message" is used in the spec where it says "note" (after ticket 35)
- [x] Docs only; no code or package changes

## Comments

- Requested by the user: do not edit the spec before this ticket is worked.
- Spec updated for every criterion; docs only, no code, package or migration change. Statuses were read from the code (`DomainException` call sites), so the list also covers the other codes: 400 `VALIDATION_FAILED` / `CANNOT_MESSAGE_SELF`, 401 auth codes, 403 `NOT_GROUP_OWNER`, 404 `CONVERSATION_NOT_FOUND`, 409 `USERNAME_TAKEN` / `EMAIL_TAKEN`, 429, 500.
- Found while checking: removing a User who is not a Member answers `403 NOT_A_MEMBER`; noted in the spec.
- Group endpoint responses are `{ conversation }` with the Group shape (no `isMember`); only `GET /conversations/:id` adds `isMember`. Written as implemented.
- The concurrency paragraph states the single-process limit and points at ADR-0006. "note" was replaced by "System Message" throughout the spec, including user story 69.
