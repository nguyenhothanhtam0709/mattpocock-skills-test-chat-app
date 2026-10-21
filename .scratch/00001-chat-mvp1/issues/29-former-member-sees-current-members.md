# 29: Former Members see no Member list

**What to build:** `GET /conversations/:id` returns the current Members to anyone who has a membership period, so a User who left can see who joined later while Messages stay windowed. Decision (user, 2026-10-21): a Former Member sees no Members.

**Blocked by:** none

**Status:** resolved

- [x] `GET /conversations/:id` returns an empty `members` list for a Former Member of a Group (Owner id and other details they may see are decided by the implementer and recorded in Comments; do not leak who joined later)
- [x] SPA Group view for a Former Member shows no Member list and no Member count of others (the closed/read-only notice stays); consistent with ticket 28's `closed` flag
- [x] A Former Member who is re-added sees the Member list again
- [x] API and SPA tests cover a Former Member's view, a never-Member (still 404), and re-add

## Comments

- From the second code review (spec axis, finding 6). The user chose option (c): Former Members see none.
- No package was added and no migration was needed.
- Choice (minimal, consistent with ticket 28): no `memberCount` or `isMember` field added to `GET /conversations/:id`. The server returns `members: []` to a Former Member of a Group, and `closed` is still computed from the real Member list, so it stays correct. The SPA already tracks `isMember` (list, events, ticket 28's snapshot) and now shows the count only when `isMember` is true and the Group is not closed.
- Owner (guess): `Group.ownerId` became optional in the contract and is omitted for a Former Member, because after an Owner transfer the Owner may have joined after they left. Nothing else a Former Member gets from `GET /conversations/:id` names anyone.
- Guess (scope): `GET /conversations` (the list summaries) returned the same Member list for Former Members, so it is emptied too; leaving it would leak the same information. A leaver's own `POST /groups/:id/leave` response also has no Members and no Owner now, since they are a Former Member by then (the SPA only reads `closed` from it).
- SPA: the header shows no count, and the details `Sheet` shows "Only members can see who is in this group." and no Member list, for a Former Member. The closed/read-only notices are unchanged. A re-added User gets the list and count back through the existing `group.member_added` refetch.
- Tests: the never-Member 404 is covered in the API test only (the SPA never gets a 404 for a Group it lists).
