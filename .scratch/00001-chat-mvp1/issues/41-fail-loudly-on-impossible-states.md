# 41: Fail loudly on impossible states instead of silent fallbacks

**What to build:** Ticket 39 removed three `!` assertions by adding silent fallbacks. An impossible state now produces bad data instead of an error.

**Blocked by:** none

**Status:** resolved

- [x] `conversation-queries.ts`: a Direct Conversation without an other Member throws an invariant error instead of yielding `name: ''`
- [x] `contracts/src/message.ts` and `user.ts`: replace `codePointAt(0) ?? 0` with something whose intent is explicit (no meaningless `0` fallback)
- [x] Existing tests pass; add a test for the Direct invariant if it can be reached
- [x] No package changes

## Comments

- From the final code review of tickets 38-40 (standards axis, judgement calls 1 and 2).
- Resolved. `conversation-queries.ts` now throws an invariant `Error` (surfaces as 500 INTERNAL_ERROR) when a Direct Conversation has no other Member; test added in `messages.test.ts` (reached by deleting the other Member's `conversation_members` row via the pool). The `?? all[0]` self-fallback is gone too.
- Replaced `codePointAt(0) ?? 0` in `message.ts` and `user.ts` with a shared `codePointOf` helper (`contracts/src/code-point.ts`) that throws on the impossible empty char. Judgement call: a new internal helper file rather than inlining twice; not exported from the package index. No package changes.
