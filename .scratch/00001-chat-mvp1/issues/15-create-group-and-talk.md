# 15: Create a Group and talk in it

**What to build:** A User creates a Group by giving it a name and choosing initial Members from user search. They become its Owner. Every Member sees the Group appear in their sidebar instantly and can send and receive Messages in it.

**Blocked by:** 09, 12

**Status:** resolved

- [x] Group name 1–100 chars after trim, NFC, control and bidi characters rejected (contracts tests)
- [x] Create Group endpoint with name and initial Member IDs; creator becomes Owner and a Member; at most 256 Members including the Owner (`GROUP_FULL`); unknown User IDs return `USER_NOT_FOUND`
- [x] Each Member's membership starts at creation; the Group appears in each Member's Conversation list with its name
- [x] Sending to a Group works through the existing send endpoint; `message.created` reaches every Member
- [x] `conversation.created` pushed to every initial Member
- [x] Get Conversation returns Members and the Owner for a Group
- [x] SPA: "New Group" `Dialog` with a name `Field` and a Member picker (search `Command`, chosen Members as `Badge`s); the Conversation view header shows the Group name and Member count
- [x] SPA tests: create a Group and send a Message in it

## Comments

- No package was added. The ticket asks for a search `Command`, but shadcn's `Command` needs `cmdk`, which is not a dependency. The Member picker reuses the existing Username-search combobox from the New conversation dialog (the same choice ticket 07 made). Say if you want `cmdk` added.
- Assumptions: `GROUP_FULL` answers `409`; `USER_NOT_FOUND` for an unknown initial Member answers `404` with the unknown IDs in `details`; the Owner and repeated IDs in `memberIds` are counted once; a Group may be created with no other Members.
- The Owner is stored in a new `groups` table (name, owner); membership stays in `conversation_members` (periods come in ticket 17).
- `ConversationSummary.lastMessage` is now `null` for a Group with no Messages; such a Group sorts by its creation time. `conversation.created` is also pushed to the creator, so their other tabs update.
- `GET /conversations/:id` returns `kind: 'group'` with `name`, `ownerId` and `members` for a Group.
