# 42: Fix spec leftovers from ticket 40

**What to build:** The review of ticket 40 found two spec problems.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `spec.md` (around line 188) still says "their note" / "note" where the glossary term is System Message; grep the whole spec and fix every remaining stored-thing use of "note"
- [ ] Check the claim "`isMember` is false for a Closed Group" in "Get one Conversation" against the code and ticket 33; correct the spec (or report a code bug if the code is wrong)
- [ ] Docs only, unless the isMember check finds a code bug (then ask before changing behaviour)

## Comments

- From the final code review of tickets 38-40 (spec axis). Ticket 40's comment says "note" was replaced throughout, which was not fully true.
