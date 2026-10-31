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

**Status:** resolved

- [x] A Member moving their marker forward gets `200` and the new marker. A value at or below the current marker returns the unchanged marker. A value above the last sequence is clamped.
- [x] A never-Member gets `404 CONVERSATION_NOT_FOUND`. A Former Member, including every reader of a Closed Group, gets `403 NOT_A_MEMBER`. An invalid body gets `400 VALIDATION_FAILED`.
- [x] `conversation.read` reaches every socket of the reader and no socket of any other User, after mark-read and after a send. It is not pushed when the marker didn't move.
- [x] The SPA sends mark-read when the Conversation is open, visible and at the latest Message, and not while scrolled up or while the tab is hidden
- [x] `conversation.read` from another tab clears the badge, or triggers a list refetch when it doesn't cover the newest known sequence
- [x] The new schemas have contracts tests

**Verification:**
- API behaviour tests with a real `socket.io-client`.
- Web behaviour tests, driving page visibility through `document.visibilityState` and `visibilitychange`.
- A browser check with two tabs.

**Out of scope:** Read Receipts and `conversation.receipt` (ticket 05). Marking as unread.

## Comments

Resolved (closing summary):

- **API.** `PUT /api/v1/conversations/:id/read` (`MessagesController.markRead`, `MessagesService.markRead`) is one conditional `update conversation_members set read_marker = least(upToSequence, last_sequence) where read_marker < that` with no lock and no serializer. A miss falls back to reading the unchanged marker, and then to `404`/`403`. `conversation.read` goes to the reader's `user:<id>` room only when the marker moved, after mark-read and after a send (`insertMessage` now reports whether the sender's marker moved). Covered by `packages/api/src/messages/mark-read.test.ts` (real `socket.io-client`, two sessions of the reader, push log line without payload).
- **SPA.** `ConversationView` gets `reading` (tab visible and at the live edge) from `AppShell`. While reading, it sends a mark-read debounced by 300 ms with the newest sequence on screen, only past what the server already acknowledged (a send counts as acknowledged). `ConversationList` handles `conversation.read`: the count goes to 0 when the event covers the newest sequence pushed since the last list load, and otherwise the list is refetched. Covered by `packages/web/src/mark-as-read.test.tsx`.
- **Contracts.** The mark-read request/response schemas and `conversation.read`, each with a contracts test.
- **Browser check** (two tabs as alice, three Messages from bob): opening bob's Conversation in tab 1 sent `PUT .../read` 200, and tab 2's "4 unread" badge cleared. A Message bob sent while tab 1 was at the latest Message was marked read at once, and tab 2 showed no badge. The `socket push` log line for `conversation.read` has `targetUsers: 1` and no payload. The hidden-tab case was not checked in the browser, because headless tabs all report `visible`. The web tests cover it.
- **Assumptions:**
  - The Conversation summary has no sequence, so "the newest sequence the SPA knows" is the newest one pushed since the last list load. With none known, `conversation.read` refetches the list.
  - The tab that marks read clears its own badge through the same `conversation.read` push (it reaches every socket of the reader). The mark-read response does not clear it locally.
  - Opening a Conversation always sends one mark-read, even when it is already read. The server returns the unchanged marker and pushes nothing.
  - The debounce is 300 ms.
- **Follow-up:** `docs/laters.md` "New Messages pull a scrolled-up reader to the latest". The existing scroller scrolls each new anchored Message into view, so a Message that arrives while the User is scrolled up ends up marked read.

