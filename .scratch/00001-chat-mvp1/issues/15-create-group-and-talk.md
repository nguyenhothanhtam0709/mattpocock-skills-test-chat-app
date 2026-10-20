# 15: Create a Group and talk in it

**What to build:** A User creates a Group by giving it a name and choosing initial Members from user search. They become its Owner. Every Member sees the Group appear in their sidebar instantly and can send and receive Messages in it.

**Blocked by:** 09, 12

**Status:** ready-for-agent

- [ ] Group name 1–100 chars after trim, NFC, control and bidi characters rejected (contracts tests)
- [ ] Create Group endpoint with name and initial Member IDs; creator becomes Owner and a Member; at most 256 Members including the Owner (`GROUP_FULL`); unknown User IDs return `USER_NOT_FOUND`
- [ ] Each Member's membership starts at creation; the Group appears in each Member's Conversation list with its name
- [ ] Sending to a Group works through the existing send endpoint; `message.created` reaches every Member
- [ ] `conversation.created` pushed to every initial Member
- [ ] Get Conversation returns Members and the Owner for a Group
- [ ] SPA: "New Group" `Dialog` with a name `Field` and a Member picker (search `Command`, chosen Members as `Badge`s); the Conversation view header shows the Group name and Member count
- [ ] SPA tests: create a Group and send a Message in it
