# 17: Membership periods and history windows

**What to build:** What a User can read in a Group depends on when they were in it. A newly added Member sees only Messages sent after they joined. A Former Member keeps reading what was said while they were a Member but nothing after. If they are added back, they see each period they were in, but not the gap.

**Blocked by:** 16

**Status:** resolved

- [x] Membership recorded as periods (start and end positioned by sequence); a User may have several periods per Group
- [x] History (`before=` / `after=`) and Conversation list previews only include Messages within the caller's periods
- [x] Former Members still see the Group in their Conversation list and can read their windows; posting returns `NOT_A_MEMBER`
- [x] Re-adding a Former Member opens a new period; the gap stays hidden (tested)
- [x] Never-Members still get `404 CONVERSATION_NOT_FOUND`
- [x] SPA: a Former Member's Conversation view is read-only (composer replaced by an explanation); tested

## Comments

- No package was added. Migration `0009` was generated with `pnpm db:generate` (it creates `membership_periods` and drops the stopgap `removed_group_members`).
- Periods: `membership_periods(conversation_id, user_id, start_sequence, end_sequence)`; a Message is readable when `start_sequence < sequence <= end_sequence`. Periods are written for Direct Conversations too (start 0), so one predicate serves every Conversation. `conversation_members` stays as the set of *current* Members (pushes, Member lists, the 256 cap); it is updated in the same transaction as the periods.
- Guess (ADR-0005): an open period has no nullable end; `end_sequence` defaults to `2147483647` (the largest `integer`), with a partial unique index allowing one open period per User and Conversation. Adding and removing both lock the Conversation row, so a period starts and ends exactly at the newest Message.
- Guess: the migration does not backfill periods for rows already in `conversation_members` (migrations are generated, not hand-edited). Existing databases with Conversations would need a one-off backfill (`start_sequence = 0`); none is assumed to exist before the first release.
- Guess: `ConversationSummary` gained a required `isMember: boolean` (the SPA needs it for the read-only view). Former Members get `200` from `GET /conversations/:id` (it lists the current Members) and `NOT_A_MEMBER` from posting; Owner actions by a Former Member still answer `404`.
- The list preview is the newest Message inside the caller's windows; a User added after the last Message has `lastMessage: null`.
- Not done (follow-up): membership `Marker` notes are still not stored in history. They need a position in the Message sequence (e.g. the period's `start_sequence`/`end_sequence` could place them, but notes interleaved with Messages have to respect each reader's windows). Also, a removed User's sidebar entry only flips to read-only after a reload (no push goes to them, per ticket 16).
