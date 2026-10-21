# 24: Persist membership notes in Conversation history

**What to build:** "Bob was added", "Bob was removed" and "Bob left" notes survive a reload and appear for later readers, instead of existing only while a view is open (spec stories 38 and 69).

**Blocked by:** 23

**Status:** resolved

- [x] Membership events are stored as system Messages that take a position in the Conversation sequence in the same transaction as the change (no nullable author column: model the system kind per ADR 0005)
- [x] History pagination, Conversation previews and membership windows (ticket 17) treat them like any Message: a reader sees a note only inside their periods
- [x] `message.created` carries them to current Members; the SPA renders them as `Marker` notes and the live push-only notes are removed so they don't double up
- [x] Previews and unread-style ordering are not changed by notes unless the spec says so (record the choice)
- [x] API and SPA tests cover add, remove, leave, reload, and a Former Member's window

## Comments

- Suggested approach from the review (user: "how about your suggestion").
- No package was added. Migration `0010` was generated with `pnpm db:generate`.
- Model (ADR 0005, no nullable author): a note is a row in `messages` with a new `kind` column (`text` default, or `member_added` / `member_removed` / `member_left`, with a check constraint). `sender_id` stays `NOT NULL` and is whoever made the change (the Owner for add/remove, the leaver for leave); `body` defaults to `''`; `client_message_id` now has a DB default `gen_random_uuid()` (notes have no client). The User a note is about lives in a one-to-one table `membership_notes(message_id, subject_id)`, both `NOT NULL`, so nothing is nullable.
- Position (guess): add, remove and leave take the next sequence under the Conversation row lock in the same transaction as the membership change. The note sits inside the subject's own period: an added User's period starts just before their "added" note, and a removed or leaving User's period ends at their note. So Bob sees "Bob was added" as his first entry and "Bob was removed" / "Bob left" as his last. Everyone else sees a note only if it falls inside one of their periods, via the same window predicate as Messages. Creating a Group writes no notes (guess: the initial Members are not "added").
- Contract: `Message` gained `kind` (defaults to `text` when absent, so old payloads parse) and an optional `subject` (the note's User, with Username and Nickname so the SPA can name Former Members). `message.created` carries notes to the Group room, so current Members and the added User get it once; the removed User and the leaver do not (they left the room first).
- Choice (previews and order): notes never become a Conversation's preview and never move it in the list. The preview/order query only considers `kind = 'text'`, and the SPA list ignores `message.created` for notes. The spec says nothing for or against, and the ticket says not to change previews unless the spec does. History pagination, windows and gap-fill (`after=`) do treat notes as Messages (a page may contain a note; `limit` counts them).
- Push-only notes removed: the SPA renders `Marker` notes only from stored Messages (`message.created` or history). The `group.member_*` events remain and now only keep the header Member count and the details list current.
- Existing tests: three history/leave tests now filter to `text` where they compare bodies; two push assertions now expect an extra `message.created` for the note.
- Not done: old rows stay `text`; no notes are backfilled for past membership changes.
