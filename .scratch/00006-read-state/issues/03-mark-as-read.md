# 03: Mark as read

**What to build:** Reading a Conversation clears its badge on every tab and device of the User (spec 00006, "HTTP API", "Real-time push" and "SPA"). Touches the api, contracts and web packages.

**Demo:** with two tabs open, opening a Conversation in one and reaching its latest Message clears the badge in both.

- **API.** `PUT /api/v1/conversations/:id/read` with body `{ upToSequence }`, returning `200 { upToSequence }`.
  - The new marker is the largest of the current marker and `upToSequence`, clamped to the Conversation's last sequence.
  - It is one conditional update of the caller's membership row, with no Conversation row lock and no commit-order serializer.
- **Push.** After any marker move (by mark-read, and by sending from ticket 02), push `conversation.read` with `{ conversationId, upToSequence }` to the reader's own `user:<id>` room. It is logged like other pushes, with no payload.
- **SPA:**
  - **Sending mark-read.** When the Conversation is open, the document is visible and the view is at the latest Message (including jumping to latest, and Messages arriving while there), send a debounced mark-read with the highest sequence on screen.
  - **On `conversation.read`.** Set the count to 0 when `upToSequence` covers the newest sequence the SPA knows for that Conversation, and refetch the list otherwise.
- Contracts: the request and response schemas and the `conversation.read` event.

**Allowed packages:** None

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] A Member moving their marker forward gets `200` and the new marker. A value at or below the current marker returns the unchanged marker. A value above the last sequence is clamped.
- [ ] A never-Member gets `404 CONVERSATION_NOT_FOUND`. A Former Member, including every reader of a Closed Group, gets `403 NOT_A_MEMBER`. An invalid body gets `400 VALIDATION_FAILED`.
- [ ] `conversation.read` reaches every socket of the reader and no socket of any other User, after mark-read and after a send. It is not pushed when the marker didn't move.
- [ ] The SPA sends mark-read when the Conversation is open, visible and at the latest Message, and not while scrolled up or while the tab is hidden
- [ ] `conversation.read` from another tab clears the badge, or triggers a list refetch when it doesn't cover the newest known sequence
- [ ] The new schemas have contracts tests

**Verification:**
- API behaviour tests with a real `socket.io-client`.
- Web behaviour tests, driving page visibility through `document.visibilityState` and `visibilitychange`.
- A browser check with two tabs.

**Out of scope:** Read Receipts and `conversation.receipt` (ticket 05). Marking as unread.

## Comments
