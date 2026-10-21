# 29: Former Members see no Member list

**What to build:** `GET /conversations/:id` returns the current Members to anyone who has a membership period, so a User who left can see who joined later while Messages stay windowed. Decision (user, 2026-10-21): a Former Member sees no Members.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `GET /conversations/:id` returns an empty `members` list for a Former Member of a Group (Owner id and other details they may see are decided by the implementer and recorded in Comments; do not leak who joined later)
- [ ] SPA Group view for a Former Member shows no Member list and no Member count of others (the closed/read-only notice stays); consistent with ticket 28's `closed` flag
- [ ] A Former Member who is re-added sees the Member list again
- [ ] API and SPA tests cover a Former Member's view, a never-Member (still 404), and re-add

## Comments

- From the second code review (spec axis, finding 6). The user chose option (c): Former Members see none.
