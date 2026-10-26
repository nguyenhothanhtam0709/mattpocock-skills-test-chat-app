# 05: Coding conventions

**What to build:** Four Intent Docs in `docs/conventions/`: `general` (TypeScript, naming, errors, imports, file and test placement), `api` (feature modules, controllers, services, guards, database access, error mapping, throttling), `web` (components, hooks, data fetching, routing, shadcn/ui use, state) and `contracts` (schema style, what a breaking change is, colocated tests). An agent first reads the code and proposes the conventions it already follows, flagging inconsistencies. The human approves each file in a grilling session; the agent writes up what was decided. Each convention is one short rule plus a pointer to a real reference file, never pasted code. Each file has `kind: intent` front matter.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Four files, each approved by the human in a grilling session
- [x] Every convention points to an existing reference file; no code snippets
- [x] Every flagged inconsistency is a Ticket or a `docs/laters.md` entry
- [x] Existing lint rules that encode conventions (Zod-only validation, no `dangerouslySetInnerHTML`) are referenced, not restated
- [x] `pnpm lint` passes

## Comments
Human approved `general`, `api`, `web` and `contracts` in a grilling session. Agent reviewed: every link resolves, no code snippets, `kind: intent` on all four, `pnpm lint` passes. Inconsistencies: ticket 12 (stale throttling comments) and eight new entries in `docs/laters.md` (mocks, the one `any`, uuid pipe, API `signUp` copies, web cleanups, web request helper, web test people, contracts cleanups).
