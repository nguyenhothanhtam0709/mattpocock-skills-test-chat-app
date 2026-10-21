# 44: Small cleanups from the review of tickets 38-40

**What to build:** Judgement-call smells. No behaviour change.

**Blocked by:** none

**Status:** needs-triage

- [ ] `groups.service.ts`: `LeaveOutcome.closedFor: string[] | undefined` carries "did it close" and "who to notify"; decide whether to split it (record the decision in Comments)
- [ ] `pushCreated` checks that `summaries()` returned a row instead of destructuring `[conversation]` unchecked
- [ ] `send()`: drop the redundant `const message = ...; return message`
- [ ] `leave-group.test.ts`: share the signUp / createGroup / connectSocket set-up with neighbouring tests if it reads better
- [ ] Existing tests pass

## Comments

- From the final code review of tickets 38-40 (standards axis, judgement calls 3-5).
