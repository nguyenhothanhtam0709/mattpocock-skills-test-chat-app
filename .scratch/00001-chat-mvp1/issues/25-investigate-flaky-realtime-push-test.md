# 25: Investigate flaky `realtime-push.test.tsx`

**What to build:** "moves a Conversation to the top…" failed once in a full-suite run and passed on rerun. Find the cause and make it deterministic.

**Blocked by:** none

**Status:** resolved

- [x] Reproduce (loop the test, run under load) and identify the race
- [x] Fix the test or the code; no arbitrary sleeps
- [x] Test passes 50 consecutive runs and within the full suite

## Comments

**Root cause.** `useRealtimeEvents` (and `useReconnected`) refreshed the ref holding the latest listener in a passive `useEffect`. In `ConversationList` the listener closes over `listed`, which is `undefined` until the first load finishes. When the load resolved, React committed the list to the DOM and `findByRole('button', { name: /Bob.*oldest/ })` resolved off that DOM mutation, so the test emitted `message.created` before the passive effect ran. The ref still held the "not loaded yet" listener, which returns early (`if (!listed) return`), so the push was silently dropped and the row never moved. This is a real (tiny) window in the app, not only a test artefact, and it only shows under CPU load.

**Reproduction.** Parallel loops of `vitest run -t "moves a Conversation"`: 2 of 48 failed on the original code.

**Ruled out.** A weak query (`findAllByRole(/hello there|older/)` resolving on the carol row alone) was tried first as a test-side fix; it still failed 7 of 60 under load, so it was reverted.

**Fix.** Update the listener refs in `useLayoutEffect`, which runs synchronously in the commit, before the DOM change is observable. No sleeps, no package changes.

**Verification.** 72 of 72 passes under the same parallel load after the fix, plus full lint, typecheck and test suite.
