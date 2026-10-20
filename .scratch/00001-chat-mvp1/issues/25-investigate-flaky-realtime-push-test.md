# 25: Investigate flaky `realtime-push.test.tsx`

**What to build:** "moves a Conversation to the top…" failed once in a full-suite run and passed on rerun. Find the cause and make it deterministic.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Reproduce (loop the test, run under load) and identify the race
- [ ] Fix the test or the code; no arbitrary sleeps
- [ ] Test passes 50 consecutive runs and within the full suite
