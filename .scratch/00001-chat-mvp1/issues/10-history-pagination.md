# 10: History pagination

**What to build:** In a long Conversation, a User scrolls up and older Messages load seamlessly without the view jumping, and a "jump to latest" control brings them back to the newest Message.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] History query with `before=<sequence>` returns older Messages newest-first; `after=<sequence>` returns newer Messages oldest-first (for gap-fill)
- [ ] `limit` 1–100, default 10; responses include `hasMore`
- [ ] Out-of-range or malformed cursors return `VALIDATION_FAILED`
- [ ] SPA: reaching the top loads the previous page via `before=`; scroll position is preserved when older Messages are prepended (explicit test); `MessageScrollerButton` jumps to latest
