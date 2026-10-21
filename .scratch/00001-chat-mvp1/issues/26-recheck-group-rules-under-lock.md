# 26: Re-check Owner, Closed and Member rules under the Conversation lock

**What to build:** Group mutations and sends check their preconditions outside the transaction, so a concurrent change can slip through. Move the checks inside the transaction, after the Conversation row lock is taken.

**Blocked by:** none

**Status:** resolved

- [x] `addGroupMember` and `removeGroupMember` re-verify under the lock that the caller is still the Owner and a Member and that the Group is not closed; a Closed Group can never regain a Member (test: Owner `leaveGroup` racing `addGroupMember` leaves the Group closed and the add returns `GROUP_CLOSED`)
- [x] An ex-Owner (ownership transferred mid-request) cannot add or remove (`NOT_GROUP_OWNER`)
- [x] `leaveGroup` re-verifies membership under the lock
- [x] `send` re-verifies the sender is a current Member under the lock, so a User removed mid-request gets `NOT_A_MEMBER` and no Message lands after their period end
- [x] Race tests use real concurrent requests (not sleeps)

## Comments

- From the second code review (spec axis, findings 1 and 4). Spec: "becomes a Closed Group permanently"; ticket 16: "A removed Member can no longer post".
- Implemented with no assumptions beyond: the race tests hold the Conversation row lock from a second connection and queue requests in a fixed order (polling `pg_stat_activity` for Lock waits, no sleeps), so both orderings are deterministic. A Former Member whose `leaveGroup` is queued behind a closing leave now gets `GROUP_CLOSED` (same order of checks as before, now under the lock).
