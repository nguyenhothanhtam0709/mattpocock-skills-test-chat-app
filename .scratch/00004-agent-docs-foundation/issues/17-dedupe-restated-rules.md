# 17: Each rule lives in one doc

**What to build:** The spec says no rule is restated; each lives in exactly one doc and others link to it. The review found two rules written out in several places:

- IDs and created timestamps come from the database: ADR 0004, `docs/conventions/general.md#generated-values` and `packages/api/AGENTS.md`.
- Never hand-edit a migration: ADR 0003, `packages/api/AGENTS.md` and `docs/workflow/definition-of-done.md`.

Keep each rule in its ADR. Other docs state it in at most a few words as a link (a checklist item or a "never" line may name the rule but must link the ADR, not explain it). `general.md#generated-values` keeps only what the ADRs don't say (request ids, JWT `jti`/`iat`, the injected `Clock`). The root `AGENTS.md` `## Agent skills` block is skill-generated and stays unchanged. Found in the spec's final code review; the human approved changing the conventions approved in ticket 05.

**Allowed packages:** None

**Blocked by:** 14

**Status:** resolved

- [x] Neither rule is explained outside its ADR; every other mention links the ADR
- [x] `general.md#generated-values` keeps only the app-generated exceptions
- [x] The root `AGENTS.md` is unchanged
- [x] Every link resolves; `pnpm lint` passes

**Verification:** None beyond the definition of done.

**Out of scope:** Other rules; a repo-wide restated-rule audit.

## Comments

Resolved: the migration and DB-generated-values rules now live only in ADRs 0003/0004; `packages/api/AGENTS.md` and the definition of done name them with a link, `general.md#generated-values` keeps only the app-generated exceptions. Verified with a link check and `pnpm lint`; root `AGENTS.md` unchanged.
