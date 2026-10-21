# 35: Use the glossary term "System Message" in code; remove `!` assertions

**What to build:** `GLOSSARY.md` defines "System Message" and says to avoid "note" as a stored thing, but the code and schema use "note" (`membership_notes`, `messages_note_body_check`, `insertNote`, `NoteKind`, `Row.note`, `noteText`, `NOTE_VERBS`). Rename to match, and remove the remaining non-null assertions and avoidable casts.

**Blocked by:** 33, 34

**Status:** resolved

- [x] Rename table, constraint, code identifiers, comments and UI-internal names from "note" to "system message" (user-facing `Marker` text is unchanged); schema renames via `pnpm db:generate` only (rename, not drop/create, if drizzle-kit offers it; otherwise accept drop/create since no data exists)
- [x] Remove `memberIds[0]!` in `groups.service.ts` and `!prev!.note` in `ConversationView.tsx` `toEntries` with properly typed code; remove avoidable casts in the files touched by this range (e.g. `socket-realtime.ts`'s `name as RealtimeEventName`)
- [x] No behaviour change; the existing test suite passes (test names and imports may be renamed)

## Comments

- From the final code review (standards axis, hard findings 1 and 2). The `!` rule is a judgement call, not an ADR.
- Table `membership_notes` is now `system_messages` and `messages_note_body_check` is `messages_system_message_body_check`; migration `0013` (from `pnpm db:generate`, table rename chosen at the prompt) renames the table and re-creates its constraints under the new names. Code, comments and tests use "System Message"; `Marker` text is unchanged.
- `memberIds[0]!` is gone (`pushCreated` takes the `ownerId`); `toEntries` narrows `prev` without `!`; `socket-realtime.ts` uses an `isRealtimeEventName` type guard instead of `as RealtimeEventName`.
- No package added; no behaviour change, the suites pass unchanged apart from renames.
