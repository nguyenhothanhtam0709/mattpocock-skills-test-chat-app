# 08: Send a first Direct Message and see it

**What to build:** A User picks someone from user search, types a Message, and sends it. This creates the Direct Conversation between them, and the sender sees the Conversation open with their Message in it. The recipient sees the Message when they open the same Conversation.

**Blocked by:** 07

**Status:** resolved

- [x] UUIDv7 IDs for all new entities
- [x] Direct send endpoint creates the Direct Conversation on the first Message; at most one Direct Conversation per pair of Users, even under concurrent first sends (DB constraint)
- [x] Send to an existing Conversation endpoint
- [x] Each Message gets a server-assigned, strictly increasing per-Conversation sequence number (counter incremented in the same row-locked transaction as the insert); concurrent sends get distinct, increasing sequences (tested)
- [x] `(sender, client message ID)` is unique; a resend with the same client message ID returns the original Message with `200` instead of `201`
- [x] Message body: plain text, max 4000, rejected if empty after trim, stored untrimmed; newlines and `<`, `>` preserved exactly (contracts tests + one round-trip API test)
- [x] `CANNOT_MESSAGE_SELF` when messaging yourself; `USER_NOT_FOUND` for an unknown recipient
- [x] Get latest Messages of a Conversation (simple, most recent first page); Users who were never Members get `404 CONVERSATION_NOT_FOUND`
- [x] Message send rate limit 30 / 10 s / User
- [x] Captured logs from a send never contain the Message body
- [x] SPA: choosing a User in the search dialog opens a new Conversation view; Messages are rendered as text in `MessageScroller` → `MessageGroup` / `Message` / `Bubble` (own Messages on the end side), day dividers as `Marker`
- [x] SPA composer: `InputGroup` textarea, Enter sends, Shift+Enter inserts a newline, character counter near the limit
- [x] SPA tests: send a first Message and see it; a Message containing `<b>hi</b>` is shown literally
