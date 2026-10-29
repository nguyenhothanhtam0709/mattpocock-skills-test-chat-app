# 05: Read Receipts in Direct Conversations

**What to build:** Show "Seen" in Direct Conversations when both Users share read receipts (spec 00006, "Domain rules", "HTTP API", "Real-time push" and "SPA"). Touches the api, contracts and web packages.

- **API:**
  - `GET /api/v1/conversations/:id` for a Direct Conversation gains `readUpToSequence`, the other User's Read Marker. It is present only when both Users share read receipts and is omitted otherwise. Groups never have it.
  - When a Member's marker moves in a Direct Conversation and both Users share read receipts, push `conversation.receipt` with `{ conversationId, upToSequence }` to the other User's `user:<id>` room. The server decides at send time.
- **SPA.** In a Direct Conversation, "Seen" appears under the newest of the User's own Messages whose sequence is at or before the other User's marker. The marker comes from `readUpToSequence` on open and from `conversation.receipt` after that. With no marker, nothing is shown.
- Contracts: the optional field and the `conversation.receipt` event.

**Allowed packages:** None

**Blocked by:** 03, 04

**Status:** resolved

- [x] `readUpToSequence` is present when both Users share read receipts, and omitted when either doesn't
- [x] A Group's Conversation response never has `readUpToSequence`
- [x] A marker move in a Direct Conversation pushes `conversation.receipt` to the other User's sockets when both share, and to nobody when either doesn't
- [x] Marker moves in a Group never push `conversation.receipt`
- [x] The reader's own sockets get `conversation.read` and not `conversation.receipt`
- [x] The SPA shows "Seen" under the right Message on open, moves it on `conversation.receipt`, and shows nothing when the field is absent
- [x] The contract changes have contracts tests

**Verification:**
- API behaviour tests with two Users toggling the setting.
- Web behaviour tests for placing and moving "Seen".
- A browser check of "Seen" in a Direct Conversation.

**Out of scope:** Read Receipts in Groups. Pushing setting changes. Showing when a Message was seen.

## Comments

Resolved (closing summary):

- **API.** `GET /api/v1/conversations/:id` for a Direct Conversation adds `readUpToSequence` (the other User's Read Marker) only when both Users share read receipts; Groups never have it. After a Member's marker moves (mark-read or a send), `MessagesService.pushMarkerMoved` pushes `conversation.read` to the reader and then, when the Conversation is a Direct Conversation and both Users share read receipts (looked up then, after the commit), `conversation.receipt` to the other User's `user:<id>` room. Covered by `packages/api/src/messages/read-receipts.test.ts`: both Users toggling the setting, Groups, the push log line without payload, the reader not receiving `conversation.receipt`.
- **SPA.** `ConversationView` takes the marker from `readUpToSequence` on open and on reconnect, and from `conversation.receipt` after that. It only moves forward. "Seen" is a `MessageFooter` under the newest of the User's own text Messages with a sequence at or before it, and nothing is shown with no marker. Covered by `packages/web/src/read-receipts.test.tsx`.
- **Contracts.** `readUpToSequence` (optional) on the Direct Conversation detail and the `conversation.receipt` event, each with a contracts test. The realtime events Generated Doc was regenerated.
- **Browser check** (alice and bob in two isolated contexts): alice opened the Conversation and saw "Seen" under her newest Message bob had read. She sent another one, bob opened the Conversation, and "Seen" moved under it on alice's screen with no reload. bob saw alice's receipt under his own Message. After bob turned off "Share read receipts" in his Profile, alice reloaded and saw no "Seen". The `socket push` log line for `conversation.receipt` had `targetUsers: 1` and no payload.
- **Existing tests changed (not loosened):** `realtime.test.ts` lists every push after a send. Those lists now include `conversation.receipt`, and one list waits for pushes to settle before it is compared. In `mark-read.test.ts`, the sender's `conversation.read` listener is now registered before the send. The receipt lookup now runs before the response, so the event can arrive before the send returns.
- **Assumptions:**
  - A send that moves the sender's marker also pushes `conversation.receipt` in a Direct Conversation, since it is a marker move ("the marker moved", spec "Real-time push").
  - "Seen" goes only under stored Messages, never under one still pending.
  - A marker answer from `GET` that is older than a push never moves "Seen" back: the larger value wins. An answer without `readUpToSequence` clears it.
- **Noticed, not changed:** `pnpm db:seed` inserts Messages without moving the senders' Read Markers, so seeded bob starts at 0 in the alice and bob Conversation. That is dev data only.
