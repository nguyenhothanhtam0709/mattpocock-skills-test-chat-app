# 08: Architecture docs

**What to build:** Two Descriptive Docs in `docs/architecture/`, drafted by an agent from the code and reviewed by the human. The overview: a context diagram (browser, web, API, Postgres, with contracts as the shared seam), what each package owns, and the dependency direction. Runtime flows: sequence diagrams for sign-up, login and session refresh; sending a Message (HTTP in, server push out, per ADR 0001); and loading a Conversation and its history. Both link to the Generated Docs and ADRs instead of repeating them. Each has `kind: descriptive` front matter.

**Blocked by:** 07

**Status:** needs-info

- [x] Both docs use Mermaid diagrams and Chat glossary terms
- [ ] Every claim matches the current code; anything unsure is asked, not guessed
- [x] No content duplicated from Generated Docs or ADRs; they are linked
- [x] Every link resolves; `pnpm lint` passes

## Comments

Agent: drafted `docs/architecture/overview.md` and `runtime-flows.md`. Each claim was checked against the code; links and `pnpm lint` verified. Left unticked ("Every claim matches the current code") and Status set to `needs-info` until the human reviews. Open questions, not guessed:

1. Production topology: only the Vite dev proxy is documented. What serves the SPA and routes `/api` and `/socket.io` in production (`serve:web` is `vite preview`)?
2. Sign-up shows "Account created" but does not sign the User in. Is that intended for MVP1, or a gap to omit from the flow?
