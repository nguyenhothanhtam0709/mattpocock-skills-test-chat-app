# 10: Factory docs

**What to build:** Intent Docs in `docs/factory/` describing the software factory, each from a grilling session with the human: the overview (stages from idea to merge and learning, who owns each: human, agent or machine); the Ticket lifecycle (the `Status` state machine and who may move a Ticket between states); agent roles (inputs, outputs, allowed tools and skills, stop conditions); gates (what each stage must pass, where a human must approve); failure modes (red CI, a stuck agent, conflicting Tickets, a wrong spec). Use Factory glossary terms and add new ones through the domain-modeling skill. Each has `kind: intent` front matter.

**Blocked by:** 04

**Status:** ready-for-human

- [ ] Five docs, each approved in a grilling session
- [ ] Enforcement that is not built yet is marked as such and points to the `docs/laters.md` entry
- [ ] No Chat terms used for process concepts
- [ ] Every link resolves; `pnpm lint` passes

## Comments
