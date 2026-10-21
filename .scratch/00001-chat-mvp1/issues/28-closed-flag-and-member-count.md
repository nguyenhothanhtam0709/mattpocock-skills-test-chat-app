# 28: Closed flag on Group and a reliable Member count

**What to build:** The spec's "Get one Conversation (Members, Owner, closed flag)" has no closed flag, and the SPA infers closed state from `memberCount + memberDelta`, which drifts.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `GroupSchema` gains `closed` (derived server-side, not a nullable column) returned by `GET /conversations/:id` and the list
- [ ] SPA reads `closed` instead of inferring it; a Former Member can tell open from closed
- [ ] The Member count comes from the server and is re-synced on reconnect and list reload instead of `target.memberCount + memberDelta`; no double count when `group.member_added` arrives after a reload or for the added User's own view
- [ ] `selfLeft` is cleared when the User is re-added
- [ ] API and SPA tests cover each case

## Comments

- From the second code review (spec axis, "closed flag missing" and finding 5).
