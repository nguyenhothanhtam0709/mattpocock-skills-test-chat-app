# 31: Enforce the note kind invariant in the schema

**What to build:** `messages.body DEFAULT ''` and `client_message_id DEFAULT gen_random_uuid()` exist so notes can omit them, and "a `membership_notes` row exists iff `kind` is not `text`" is only a convention. ADR 0005 asks for CHECK/UNIQUE/FK constraints on invariants.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Schema enforces the invariant as far as Postgres can (CHECK on `body` for notes; a constraint or composite FK tying `membership_notes` to `kind <> 'text'` rows); if part of it cannot be enforced in the DB, say why in a schema comment
- [ ] Migration generated with `pnpm db:generate` (never hand-edited)
- [ ] Tests show an invalid combination is rejected by the database

## Comments

- From the second code review (standards axis, ADR 0005 spirit).
