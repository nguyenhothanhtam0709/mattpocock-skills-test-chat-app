# 13: Close the `kind` front matter gaps

**What to build:** ADR 0008 says every doc declares `kind` in front matter, with only Specs, Tickets and ADRs exempt, and the README repeats that. These docs have none: `packages/{api,web,contracts}/AGENTS.md`, `GLOSSARY-MAP.md`, `docs/factory/GLOSSARY.md`, `docs/laters.md` and `docs/workflow/no-assumptions.md`. The skill-generated root `AGENTS.md`, `docs/agents/*` and `docs/workflow/git-workflow.md` have none either. Make the rule and the files agree: add `kind: intent` front matter to `packages/{api,web,contracts}/AGENTS.md`, `GLOSSARY-MAP.md`, `docs/factory/GLOSSARY.md` and `docs/workflow/no-assumptions.md`. Widen the ADR 0008 exemption to `docs/laters.md` (a backlog of notes, not commitments, so it must not outrank code) and to the files the mattpocock skills generate (root `AGENTS.md`, `docs/agents/`, `docs/workflow/git-workflow.md`), which the skills own and rewrite. Make the README's front matter sentence match. Found in the spec's final code review.

**Allowed packages:** None

**Blocked by:** 14, 17

**Status:** resolved

- [x] Every doc either declares `kind` or falls under an exemption written in ADR 0008
- [x] The README's front matter sentence is true
- [x] No skill-generated file changes without the human's approval at the prompt
- [x] Every link resolves; `pnpm lint` passes

**Verification:** a script lists every `.md` outside `.scratch/`, `node_modules/` and `docs/adr/` without `kind` front matter, and each one is covered by a written exemption.

**Out of scope:** Enforcing front matter in CI (see the enforcement entry in `docs/laters.md`).

## Comments

- **Question for the human:** add `kind: intent` to the non-skill files listed above and exempt skill-generated files in ADR 0008, or leave the files alone and widen the ADR 0008 exemption to AGENTS.md files, glossaries and Laters?
- **Human's decision:** add `kind: intent` to `packages/{api,web,contracts}/AGENTS.md`, `GLOSSARY-MAP.md`, `docs/factory/GLOSSARY.md` and `docs/workflow/no-assumptions.md`. In ADR 0008, exempt `docs/laters.md` alongside Specs and Tickets (a backlog of notes, not commitments, so it must not outrank code), and exempt the files the mattpocock skills generate (root `AGENTS.md`, `docs/agents/`, `docs/workflow/git-workflow.md`) because the skills own and rewrite them. Make the README's front matter sentence match.
- **Question for the human (agent):** Done as decided: `kind: intent` added to the six files, ADR 0008 and the README now list the exemptions, `pnpm lint` passes. The Verification script still reports one file: the root Chat `GLOSSARY.md` has no `kind` and is neither in the decision nor in the original list. The spec says the Chat glossary stays "unchanged" (it is maintained through the domain-modeling skill), so I did not touch it. Options: (a) add `kind: intent` to `GLOSSARY.md`, matching `docs/factory/GLOSSARY.md` (recommended: both glossaries then follow one rule; front matter is not a rewording); (b) exempt the Chat glossary in ADR 0008 and the README. Blocked: the first two checklist items and closing the Ticket.
- **Human's decision:** (a), add `kind: intent` to `GLOSSARY.md`.
- **Closed:** `kind: intent` on the six docs and the Chat `GLOSSARY.md`; ADR 0008 and the README name the exemptions (Specs, Tickets, ADRs, `docs/laters.md`, skill-generated files). The Verification script reports no missing file.
