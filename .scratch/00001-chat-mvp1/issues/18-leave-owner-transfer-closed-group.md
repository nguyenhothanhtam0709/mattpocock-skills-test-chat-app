# 18: Leave a Group, Owner transfer, and Closed Group

**What to build:** Any Member can leave a Group after confirming. If the Owner leaves, ownership passes to the longest-standing Member and everyone is told. If the last Member leaves, the Group becomes a Closed Group: a read-only record that no one can post to or join.

**Blocked by:** 17

**Status:** ready-for-agent

- [ ] Leave endpoint for any Member; the leaver becomes a Former Member (their period ends)
- [ ] Owner leaving transfers ownership to the Member with the longest current period; `group.owner_changed` pushed
- [ ] `group.member_left` pushed to remaining Members and shown as a `Marker` note
- [ ] Last Member leaving closes the Group permanently; `group.closed` pushed; sending or adding to a Closed Group returns `GROUP_CLOSED`
- [ ] Former Members can still read their windows of a Closed Group
- [ ] SPA: Leave action in the Group details `Sheet` with `AlertDialog` confirmation; Owner badge updates on transfer; Closed Group view is read-only; tested
