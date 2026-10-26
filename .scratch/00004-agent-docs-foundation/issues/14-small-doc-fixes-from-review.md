# 14: Small doc fixes from the review

**What to build:** Three small doc corrections found in the spec's final code review:

1. `packages/api/AGENTS.md` cites ADR 0005 (nullable columns) as a reason never to hand-edit a migration. Only ADR 0003 covers that; cite it alone.
2. The `docs/laters.md` entry "Review the mocks in tests" says `docs/conventions/general.md` holds the mocking rule. It now lives in [testing policy](../../../docs/workflow/testing-policy.md#mocking); point there.
3. `packages/contracts/AGENTS.md` says to run `pnpm docs:generate` "after changing the schema, routes or realtime events", copied from the API file. Only realtime events are defined in contracts; say that. The human approved this departure from ticket 06's wording.

**Allowed packages:** None

**Blocked by:** None

**Status:** ready-for-agent

- [ ] `packages/api/AGENTS.md` cites only ADR 0003 for migrations
- [ ] The Laters entry points to `docs/workflow/testing-policy.md#mocking`
- [ ] `packages/contracts/AGENTS.md` names only realtime events as the trigger for `pnpm docs:generate`
- [ ] Every link resolves; `pnpm lint` passes

**Verification:** None beyond the definition of done.

**Out of scope:** Other wording in these files.

## Comments
