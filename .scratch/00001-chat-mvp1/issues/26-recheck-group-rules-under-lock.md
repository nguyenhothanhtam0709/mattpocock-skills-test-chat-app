# 26: Re-check Owner, Closed and Member rules under the Conversation lock

**What to build:** Group mutations and sends check their preconditions outside the transaction, so a concurrent change can slip through. Move the checks inside the transaction, after the Conversation row lock is taken.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] `addGroupMember` and `removeGroupMember` re-verify under the lock that the caller is still the Owner and a Member and that the Group is not closed; a Closed Group can never regain a Member (test: Owner `leaveGroup` racing `addGroupMember` leaves the Group closed and the add returns `GROUP_CLOSED`)
- [ ] An ex-Owner (ownership transferred mid-request) cannot add or remove (`NOT_GROUP_OWNER`)
- [ ] `leaveGroup` re-verifies membership under the lock
- [ ] `send` re-verifies the sender is a current Member under the lock, so a User removed mid-request gets `NOT_A_MEMBER` and no Message lands after their period end
- [ ] Race tests use real concurrent requests (not sleeps)

## Comments

- From the second code review (spec axis, findings 1 and 4). Spec: "becomes a Closed Group permanently"; ticket 16: "A removed Member can no longer post".
