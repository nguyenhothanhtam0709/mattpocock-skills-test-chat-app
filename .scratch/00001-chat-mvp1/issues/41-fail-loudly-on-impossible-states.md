# 41: Fail loudly on impossible states instead of silent fallbacks

**What to build:** Ticket 39 removed three `!` assertions by adding silent fallbacks. An impossible state now produces bad data instead of an error.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `conversation-queries.ts`: a Direct Conversation without an other Member throws an invariant error instead of yielding `name: ''`
- [ ] `contracts/src/message.ts` and `user.ts`: replace `codePointAt(0) ?? 0` with something whose intent is explicit (no meaningless `0` fallback)
- [ ] Existing tests pass; add a test for the Direct invariant if it can be reached
- [ ] No package changes

## Comments

- From the final code review of tickets 38-40 (standards axis, judgement calls 1 and 2).
