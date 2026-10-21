# 37: Small cleanups in the Group service and web shell

**What to build:** Judgement-call smells from the final review. No behaviour change.

**Blocked by:** 35

**Status:** ready-for-agent

- [ ] `leave` and `removeMember` share the repeated push sequence (`GROUP_MEMBER_*`, `MESSAGE_CREATED`, `GROUP_MEMBERSHIP_ENDED`); `addMember` and `create` use `pushSafely` like the others instead of hand-rolled try/catch
- [ ] Conversation kind and system-message kinds come from one shared definition (contracts) used by the SQL check, the service and `NOTE_VERBS`-style maps, instead of repeated literals
- [ ] Clearer names for `only`, `memberRow`, `queue`, `held`, `after`, `change`; `groupAs` no longer calls `messagesService.get` just to read `conversation`
- [ ] Decide whether `KeyedSerializer` stays its own file (record the decision in Comments)
- [ ] Existing tests pass untouched

## Comments

- From the final code review (standards axis, judgement calls).
