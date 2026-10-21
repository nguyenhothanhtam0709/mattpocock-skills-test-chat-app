# 29: Should a Former Member see the current Member list?

**What to build:** Decide, then implement. `GET /conversations/:id` returns the current Members to anyone who has a membership period, so a User who left can see who joined later, while Messages stay windowed.

**Blocked by:** none

**Status:** needs-info

- [ ] Decision recorded by the user: (a) Former Members see current Members, (b) they see only Members during their periods, or (c) they see none
- [ ] Implement the decision; tests cover a Former Member's view

## Comments

- From the second code review (spec axis, finding 6). The spec does not say; needs the user's call.
