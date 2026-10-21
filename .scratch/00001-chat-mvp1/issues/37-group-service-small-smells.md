# 37: Small cleanups in the Group service and web shell

**What to build:** Judgement-call smells from the final review. No behaviour change.

**Blocked by:** 35

**Status:** resolved

- [x] `leave` and `removeMember` share the repeated push sequence (`GROUP_MEMBER_*`, `MESSAGE_CREATED`, `GROUP_MEMBERSHIP_ENDED`); `addMember` and `create` use `pushSafely` like the others instead of hand-rolled try/catch
- [x] Conversation kind and system-message kinds come from one shared definition (contracts) used by the SQL check, the service and `NOTE_VERBS`-style maps, instead of repeated literals
- [x] Clearer names for `only`, `memberRow`, `queue`, `held`, `after`, `change`; `groupAs` no longer calls `messagesService.get` just to read `conversation`
- [x] Decide whether `KeyedSerializer` stays its own file (record the decision in Comments)
- [x] Existing tests pass untouched

## Comments

- From the final code review (standards axis, judgement calls).
- `leave` and `removeMember` share `pushMembershipEnd`; `create` and `addMember` use `pushSafely` (now async, so it also wraps the reads that can throw).
- `CONVERSATION_KINDS`, `SYSTEM_MESSAGE_KINDS` and `MESSAGE_KINDS` live in contracts (`message.ts`); the `schema.ts` checks build their `in (...)` lists from them (no schema change: `pnpm db:generate` reports nothing to migrate), the service uses `SystemMessageKind`, and the web verb map is a `Record<SystemMessageKind, string>`, so a new kind fails to compile until each is handled.
- Renames: `only` to `exactlyOne`, `memberRow` to `findMember`, `queue` to `takeSlot`, `held` to `turnHolder`, `after` to `afterCommit`, `change` to `applyChange`. `groupAs` is gone: `MessagesService.getGroup` returns the Group response directly.
- Decision: `KeyedSerializer` stays its own file. It is a generic per-key FIFO with its own invariant (slot order), while `CommitOrder` is the Conversation-specific policy on top; merging would bury that primitive in a class about locks and transactions.
- No package added; no behaviour change; the existing tests pass untouched.
