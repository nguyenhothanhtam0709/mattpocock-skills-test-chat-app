# 44: Small cleanups from the review of tickets 38-40

**What to build:** Judgement-call smells. No behaviour change.

**Blocked by:** none

**Status:** resolved

- [x] `groups.service.ts`: `LeaveOutcome.closedFor: string[] | undefined` carries "did it close" and "who to notify"; decide whether to split it (record the decision in Comments)
- [x] `pushCreated` checks that `summaries()` returned a row instead of destructuring `[conversation]` unchecked
- [x] `send()`: drop the redundant `const message = ...; return message`
- [x] `leave-group.test.ts`: share the signUp / createGroup / connectSocket set-up with neighbouring tests if it reads better
- [x] Existing tests pass

## Comments

- From the final code review of tickets 38-40 (standards axis, judgement calls 3-5).
- Implemented although Status was `needs-triage` (explicitly requested by the user).
- Decision, `closedFor`: split. `LeaveOutcome` is now a discriminated union: `{ kind: 'closed', systemMessage, notify }` (the Group closed; `notify` is everyone who was ever a Member) or `{ kind: 'open', systemMessage, newOwnerId }`. "Did it close" is the `kind`, "who to notify" is `notify`. No behaviour change.
- `pushCreated` now uses `exactlyOne(...)` on the `summaries()` result (inside its existing try/catch, so a missing row is logged and never fails the send, as before for push errors).
- Test duplication: `Person`, `signUp`, `bearer` and `createGroup` were byte-identical in `leave-group.test.ts` and five neighbouring group tests (`group-locking`, `group-members`, `group-rooms`, `history-windows`, `system-messages`). Moved to `packages/api/test/people.ts` and imported in those six files; test bodies untouched. Assumption flagged: "neighbouring tests" read as those five. Other copies (`groups.test.ts`, `messages.test.ts`, `realtime.test.ts`, auth tests) differ in shape and were left alone. The unused `password` constants were dropped with the helpers. The `connectSocket` set-up was left as is: it varies per test.
