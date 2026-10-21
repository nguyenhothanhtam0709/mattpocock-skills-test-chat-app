# 36: Document the single-instance assumption

**What to build:** Commit order equals slot order (`CommitOrder` / `KeyedSerializer`) and Socket.IO rooms are in memory, so ordering and room membership only hold with one API process. Nothing in the docs says so.

**Blocked by:** none

**Status:** resolved

- [x] New ADR (next number) recording that the API runs as a single instance, why (in-memory rooms, in-process serializer), and what would have to change to scale out (Socket.IO Redis adapter, DB-level ordering)
- [x] Spec and `docs/laters.md` link to it
- [x] Docs only; no code or package changes

## Comments

- From the final code review (spec axis, item 6). Also from that review, accepted as-is unless the user says otherwise: Former Members do not learn that a Group closed until a reload/reconnect (item 4), because no room remains to push to.

- The spec already says "Single server process" and lists multi-instance Socket.IO adapters as out of scope (spec lines ~140, ~334); this ADR makes the reason and the scale-out path explicit and is optional beyond that. Do not edit the spec here (ticket 40).

- Resolved: added ADR 0006 (`docs/adr/0006-api-runs-as-a-single-instance.md`), linked from the spec architecture bullet and a new `docs/laters.md` entry. Docs only; spec otherwise untouched (ticket 40).
