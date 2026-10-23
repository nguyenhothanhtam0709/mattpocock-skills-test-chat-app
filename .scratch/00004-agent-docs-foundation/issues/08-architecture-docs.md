# 08: Architecture docs

**What to build:** Two Descriptive Docs in `docs/architecture/`, drafted by an agent from the code and reviewed by the human. The overview: a context diagram (browser, web, API, Postgres, with contracts as the shared seam), what each package owns, and the dependency direction. Runtime flows: sequence diagrams for sign-up, login and session refresh; sending a Message (HTTP in, server push out, per ADR 0001); and loading a Conversation and its history. Both link to the Generated Docs and ADRs instead of repeating them. Each has `kind: descriptive` front matter.

**Blocked by:** 07

**Status:** ready-for-agent

- [ ] Both docs use Mermaid diagrams and Chat glossary terms
- [ ] Every claim matches the current code; anything unsure is asked, not guessed
- [ ] No content duplicated from Generated Docs or ADRs; they are linked
- [ ] Every link resolves; `pnpm lint` passes

## Comments
