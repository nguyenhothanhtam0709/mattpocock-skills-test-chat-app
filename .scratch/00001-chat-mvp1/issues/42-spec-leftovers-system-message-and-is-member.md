# 42: Fix spec leftovers from ticket 40

**What to build:** The review of ticket 40 found two spec problems.

**Blocked by:** none

**Status:** resolved

- [x] `spec.md` (around line 188) still says "their note" / "note" where the glossary term is System Message; grep the whole spec and fix every remaining stored-thing use of "note"
- [x] Check the claim "`isMember` is false for a Closed Group" in "Get one Conversation" against the code and ticket 33; correct the spec (or report a code bug if the code is wrong)
- [x] Docs only, unless the isMember check finds a code bug (then ask before changing behaviour)

## Comments

- From the final code review of tickets 38-40 (spec axis). Ticket 40's comment says "note" was replaced throughout, which was not fully true.
- Notes sweep: the only remaining stored-thing use was "ends at their note" in the System Message paragraph of `spec.md`; now "their System Message". The other hits ("Further Notes" heading, "notified"/"notification" wording for pushes) are not the stored thing and were left alone.
- `isMember` check: the claim is true, no code bug. `ConversationQueries.summaries` (list) and `MessagesService.get` (get one) both derive `isMember` from current Membership, and a Closed Group has no Members, so it is `false` for everyone. A never-Member gets 404 first (`requireReader`), so every reader of a Closed Group is a Former Member. Ticket 33 only added `isMember` for Groups and left Direct Conversations unchanged, which matches the spec. Only the wording changed: the spec now says Closed Group is `false` as a consequence, not a separate rule.
- Docs only: no code, package or migration change. No assumptions made.
