# 16: Owner adds and removes Members

**What to build:** From the Group details panel, the Owner adds Users to the Group and removes Members (with confirmation). All Members see a note like "Bob was added" inline, and a newly added User sees the Group appear in their sidebar.

**Blocked by:** 15

**Status:** ready-for-agent

- [ ] Add Member endpoint: Owner only (`NOT_GROUP_OWNER`), immediate, `ALREADY_A_MEMBER` for an existing Member, `GROUP_FULL` at 256, `USER_NOT_FOUND` for unknown Users
- [ ] Remove Member endpoint: Owner only; the Owner cannot remove themselves
- [ ] A removed Member can no longer post (`NOT_A_MEMBER`) and stops receiving pushes for the Group
- [ ] Push `group.member_added` / `group.member_removed` to all current Members; `conversation.created` to the added User
- [ ] Membership changes appear in the Conversation view as `Marker` notes
- [ ] SPA: Group details `Sheet` lists Members and marks the Owner; Owner sees Add (search `Command`) and per-Member Remove (`DropdownMenu` → `AlertDialog` confirm); non-Owners don't see those actions
- [ ] SPA tests: Owner adds and removes a Member; a non-Owner sees no management actions
