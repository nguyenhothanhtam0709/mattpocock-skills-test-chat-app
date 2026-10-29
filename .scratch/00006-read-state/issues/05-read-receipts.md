# 05: Read Receipts in Direct Conversations

**What to build:** Show "Seen" in Direct Conversations when both Users share read receipts (spec 00006, "Domain rules", "HTTP API", "Real-time push" and "SPA"). Touches the api, contracts and web packages.

- **API:**
  - `GET /api/v1/conversations/:id` for a Direct Conversation gains `readUpToSequence`, the other User's Read Marker. It is present only when both Users share read receipts and is omitted otherwise. Groups never have it.
  - When a Member's marker moves in a Direct Conversation and both Users share read receipts, push `conversation.receipt` with `{ conversationId, upToSequence }` to the other User's `user:<id>` room. The server decides at send time.
- **SPA.** In a Direct Conversation, "Seen" appears under the newest of the User's own Messages whose sequence is at or before the other User's marker. The marker comes from `readUpToSequence` on open and from `conversation.receipt` after that. With no marker, nothing is shown.
- Contracts: the optional field and the `conversation.receipt` event.

**Allowed packages:** None

**Blocked by:** 03, 04

**Status:** ready-for-agent

- [ ] `readUpToSequence` is present when both Users share read receipts, and omitted when either doesn't
- [ ] A Group's Conversation response never has `readUpToSequence`
- [ ] A marker move in a Direct Conversation pushes `conversation.receipt` to the other User's sockets when both share, and to nobody when either doesn't
- [ ] Marker moves in a Group never push `conversation.receipt`
- [ ] The reader's own sockets get `conversation.read` and not `conversation.receipt`
- [ ] The SPA shows "Seen" under the right Message on open, moves it on `conversation.receipt`, and shows nothing when the field is absent
- [ ] The contract changes have contracts tests

**Verification:**
- API behaviour tests with two Users toggling the setting.
- Web behaviour tests for placing and moving "Seen".
- A browser check of "Seen" in a Direct Conversation.

**Out of scope:** Read Receipts in Groups. Pushing setting changes. Showing when a Message was seen.

## Comments
