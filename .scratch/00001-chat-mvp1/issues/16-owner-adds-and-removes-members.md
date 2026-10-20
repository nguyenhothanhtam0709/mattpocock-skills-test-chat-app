# 16: Owner adds and removes Members

**What to build:** From the Group details panel, the Owner adds Users to the Group and removes Members (with confirmation). All Members see a note like "Bob was added" inline, and a newly added User sees the Group appear in their sidebar.

**Blocked by:** 15

**Status:** resolved

- [x] Add Member endpoint: Owner only (`NOT_GROUP_OWNER`), immediate, `ALREADY_A_MEMBER` for an existing Member, `GROUP_FULL` at 256, `USER_NOT_FOUND` for unknown Users
- [x] Remove Member endpoint: Owner only; the Owner cannot remove themselves
- [x] A removed Member can no longer post (`NOT_A_MEMBER`) and stops receiving pushes for the Group
- [x] Push `group.member_added` / `group.member_removed` to all current Members; `conversation.created` to the added User
- [x] Membership changes appear in the Conversation view as `Marker` notes
- [x] SPA: Group details `Sheet` lists Members and marks the Owner; Owner sees Add (search `Command`) and per-Member Remove (`DropdownMenu` → `AlertDialog` confirm); non-Owners don't see those actions
- [x] SPA tests: Owner adds and removes a Member; a non-Owner sees no management actions

## Comments

- No package was added. `AlertDialog` comes from `@base-ui/react/alert-dialog` (already a dependency; `alert-dialog.tsx` is written in the shadcn base-nova shape). As in ticket 15, the Add picker reuses the Username-search combobox instead of `Command` (which needs `cmdk`, not a dependency).
- Endpoints (the ticket named none): `POST /groups/:id/members` `{ userId }` answers `201` with the updated Group; `DELETE /groups/:id/members/:userId` answers `200` with the updated Group. Check order: unknown Group, Direct Conversation, or caller not a Member gives `404 CONVERSATION_NOT_FOUND`; then `403 NOT_GROUP_OWNER`; then the rule checks.
- Guesses: `ALREADY_A_MEMBER` and `GROUP_FULL` answer `409` (GROUP_FULL as in 15); unknown User `404 USER_NOT_FOUND`; the Owner removing themselves `400 VALIDATION_FAILED` (no dedicated code exists); removing someone who is not a Member `403 NOT_A_MEMBER` (was 404; aligned with every other use of the code); a removed Member posting `403 NOT_A_MEMBER`.
- A removed Member can no longer read the Group (`404`) until ticket 17 adds Former Member reading. To tell a removed Member from a never-Member when posting, a new `removed_group_members` table records removals (cleared on re-add); ticket 17's membership periods should replace it.
- Push: `group.member_added` / `group.member_removed` carry `{ conversationId, member }`. Added goes to all current Members including the added User, who also gets `conversation.created`. Removed goes to the remaining Members only; the removed User gets nothing, so their sidebar keeps the Group until a reload.
- Membership `Marker` notes are not stored: they appear in an open Conversation view as push events arrive and are gone after a reload. Storing them in history needs a position in the Message sequence, which fits ticket 17's periods. The header Member count follows the same events.
- Adding takes a row lock on the Conversation, so concurrent adds cannot exceed 256.
