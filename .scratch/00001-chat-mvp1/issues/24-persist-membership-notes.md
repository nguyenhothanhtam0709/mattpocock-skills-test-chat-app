# 24: Persist membership notes in Conversation history

**What to build:** "Bob was added", "Bob was removed" and "Bob left" notes survive a reload and appear for later readers, instead of existing only while a view is open (spec stories 38 and 69).

**Blocked by:** 23

**Status:** ready-for-agent

- [ ] Membership events are stored as system Messages that take a position in the Conversation sequence in the same transaction as the change (no nullable author column: model the system kind per ADR 0005)
- [ ] History pagination, Conversation previews and membership windows (ticket 17) treat them like any Message: a reader sees a note only inside their periods
- [ ] `message.created` carries them to current Members; the SPA renders them as `Marker` notes and the live push-only notes are removed so they don't double up
- [ ] Previews and unread-style ordering are not changed by notes unless the spec says so (record the choice)
- [ ] API and SPA tests cover add, remove, leave, reload, and a Former Member's window

## Comments

- Suggested approach from the review (user: "how about your suggestion").
