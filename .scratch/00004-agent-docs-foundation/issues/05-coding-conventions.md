# 05: Coding conventions

**What to build:** Four Intent Docs in `docs/conventions/`: `general` (TypeScript, naming, errors, imports, file and test placement), `api` (feature modules, controllers, services, guards, database access, error mapping, throttling), `web` (components, hooks, data fetching, routing, shadcn/ui use, state) and `contracts` (schema style, what a breaking change is, colocated tests). An agent first reads the code and proposes the conventions it already follows, flagging inconsistencies. The human approves each file in a grilling session; the agent writes up what was decided. Each convention is one short rule plus a pointer to a real reference file, never pasted code. Each file has `kind: intent` front matter.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [ ] Four files, each approved by the human in a grilling session
- [ ] Every convention points to an existing reference file; no code snippets
- [ ] Every flagged inconsistency is a Ticket or a `docs/laters.md` entry
- [ ] Existing lint rules that encode conventions (Zod-only validation, no `dangerouslySetInnerHTML`) are referenced, not restated
- [ ] `pnpm lint` passes

## Comments
