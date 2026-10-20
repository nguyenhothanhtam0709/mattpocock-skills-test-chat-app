# 17: Membership periods and history windows

**What to build:** What a User can read in a Group depends on when they were in it. A newly added Member sees only Messages sent after they joined. A Former Member keeps reading what was said while they were a Member but nothing after. If they are added back, they see each period they were in, but not the gap.

**Blocked by:** 16

**Status:** ready-for-agent

- [ ] Membership recorded as periods (start and end positioned by sequence); a User may have several periods per Group
- [ ] History (`before=` / `after=`) and Conversation list previews only include Messages within the caller's periods
- [ ] Former Members still see the Group in their Conversation list and can read their windows; posting returns `NOT_A_MEMBER`
- [ ] Re-adding a Former Member opens a new period; the gap stays hidden (tested)
- [ ] Never-Members still get `404 CONVERSATION_NOT_FOUND`
- [ ] SPA: a Former Member's Conversation view is read-only (composer replaced by an explanation); tested
