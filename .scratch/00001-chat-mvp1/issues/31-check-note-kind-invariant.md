# 31: Enforce the note kind invariant in the schema

**What to build:** `messages.body DEFAULT ''` and `client_message_id DEFAULT gen_random_uuid()` exist so notes can omit them, and "a `membership_notes` row exists iff `kind` is not `text`" is only a convention. ADR 0005 asks for CHECK/UNIQUE/FK constraints on invariants.

**Blocked by:** none

**Status:** resolved

- [x] Schema enforces the invariant as far as Postgres can (CHECK on `body` for notes; a constraint or composite FK tying `membership_notes` to `kind <> 'text'` rows); if part of it cannot be enforced in the DB, say why in a schema comment
- [x] Migration generated with `pnpm db:generate` (never hand-edited)
- [x] Tests show an invalid combination is rejected by the database

## Comments

- From the second code review (standards axis, ADR 0005 spirit).
- Constraints added: `messages_note_body_check` (`kind = 'text' or body = ''`), unique index `messages_id_kind_unique (id, kind)`, and on `membership_notes` a new `kind` column with `membership_notes_kind_check` (`kind <> 'text'`) plus composite FK `membership_notes_message_kind_fk (message_id, kind) -> messages (id, kind)`. Together: a note row can only hang on a non-text message of the same kind.
- Not enforceable in Postgres without a deferred constraint trigger: the other direction (every non-text message has a `membership_notes` row), and "`client_message_id` is generated only for notes". Documented in a schema comment; `insertNote` writes both rows in one transaction.
- Two migrations (0011, 0012), both from `pnpm db:generate`: drizzle emits the new foreign key before the unique index it needs, so I generated the index first, then the rest, instead of hand-editing.
- Guess: existing data is absent (as you said), so `membership_notes.kind` is `NOT NULL` with no default and the migration does not backfill.
