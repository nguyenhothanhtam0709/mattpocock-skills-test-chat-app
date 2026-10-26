# 18: Fixes from the second code review

**What to build:** Small fixes found in the spec's second, fresh-context code review:

1. `docs/conventions/general.md#typescript` says to use `interface` for named object shapes. Change these `type` object shapes to `interface`: `Route` in `packages/api/src/docs/routes.ts`, `AdrSource` in `scripts/docs/adr-index.ts`, `PackageManifest` in `scripts/docs/package-graph.ts`, `JsonSchema` in `packages/contracts/src/realtime-events-doc.ts`.
2. ADR 0008 calls `docs/laters.md` "a backlog of notes"; the Factory glossary says to avoid "Backlog". Use the glossary term (Laters).
3. ADR 0008's exemption list and its list of the three kinds render as one list. Separate them (a sentence or heading between), so the kinds don't read as exemptions.
4. ADR 0008 exempts the root `AGENTS.md` because "the skills own and rewrite" it, but only its `## Agent skills` block is skill-generated. Reword the reason so it is true for the root `AGENTS.md` (a skill rewrites part of it, and the whole file prompts before an edit). No change to which files are exempt.
5. The README restates ADR 0008's exemption list. Replace the list with a link, so the list lives only in ADR 0008.
6. `docs/workflow/escalation.md` says "task branch"; the glossary term is **Task Branch**.
7. `packages/api/src/docs/routes.ts` reads Nest's private `'__guards__'` metadata key. Add a one-line comment saying it is a Nest internal.
8. The generated ADR index summarises ADR 0007 with its first sentence, which describes the old state. Make the index line state the decision: either reword ADR 0007's opening (decision first, context after, no change to the decision) or change the generator's rule, whichever keeps every other index line correct. Regenerate with `pnpm docs:generate`.

**Allowed packages:** None

**Blocked by:** None

**Status:** resolved

- [x] The four object shapes are `interface`s
- [x] ADR 0008 uses "Laters", not "backlog"; its two lists render separately; the root `AGENTS.md` reason is true
- [x] The README links ADR 0008 for the exemptions instead of listing them
- [x] `escalation.md` says Task Branch
- [x] `routes.ts` has a comment on the `'__guards__'` key
- [x] The ADR index line for ADR 0007 states the decision
- [x] `pnpm docs:generate` leaves no diff after the change is committed; every link resolves
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass

**Verification:** run `pnpm docs:generate` and confirm `git status` is clean. Existing generator tests keep passing.

**Out of scope:** The duplicated Generated Doc header helper (ticket 16 kept it per package to avoid a cross-package dependency). The `docs:generate` and merge-check duplicates (ticket 19).

## Comments

Resolved: the four shapes are interfaces, `'__guards__'` is commented, ADR 0008 lists kinds then exemptions with true reasons, the README links ADR 0008, escalation uses Task Branch and Feature Branch, and ADR 0007 now opens with its decision (generator unchanged).
