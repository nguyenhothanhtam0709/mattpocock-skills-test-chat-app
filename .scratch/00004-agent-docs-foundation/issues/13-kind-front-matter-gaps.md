# 13: Close the `kind` front matter gaps

**What to build:** ADR 0008 says every doc declares `kind` in front matter, with only Specs, Tickets and ADRs exempt, and the README repeats that. These docs have none: `packages/{api,web,contracts}/AGENTS.md`, `GLOSSARY-MAP.md`, `docs/factory/GLOSSARY.md`, `docs/laters.md` and `docs/workflow/no-assumptions.md`. The skill-generated root `AGENTS.md`, `docs/agents/*` and `docs/workflow/git-workflow.md` have none either. Make the rule and the files agree. Found in the spec's final code review.

**Allowed packages:** None

**Blocked by:** None

**Status:** needs-info

- [ ] Every doc either declares `kind` or falls under an exemption written in ADR 0008
- [ ] The README's front matter sentence is true
- [ ] No skill-generated file changes without the human's approval at the prompt
- [ ] Every link resolves; `pnpm lint` passes

**Verification:** a script lists every `.md` outside `.scratch/`, `node_modules/` and `docs/adr/` without `kind` front matter, and each one is covered by a written exemption.

**Out of scope:** Enforcing front matter in CI (see the enforcement entry in `docs/laters.md`).

## Comments

- **Question for the human:** add `kind: intent` to the non-skill files listed above and exempt skill-generated files in ADR 0008, or leave the files alone and widen the ADR 0008 exemption to AGENTS.md files, glossaries and Laters?
