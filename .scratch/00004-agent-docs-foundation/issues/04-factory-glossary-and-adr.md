# 04: Factory glossary, glossary map and ADR 0008

**What to build:** Using the domain-modeling skill, add a root `GLOSSARY-MAP.md` listing two contexts, Chat (the existing root `GLOSSARY.md`, unchanged) and Factory (`docs/factory/GLOSSARY.md`), with two relationships: the Factory produces changes to Chat's code and docs; no term is shared, and Chat terms are never used for process concepts or the reverse. Create the Factory glossary with Intent Doc, Generated Doc, Descriptive Doc, Laters and Ticket (avoid "issue"). Write ADR 0008 "Documents are classed by how they are maintained": the three kinds, their precedence over or under code, front matter `kind`, and updating docs in the same PR.

**Blocked by:** 02

**Status:** resolved

- [x] `GLOSSARY-MAP.md` follows the domain-modeling map format and links both glossaries
- [x] The Factory glossary follows the glossary format, with no implementation details
- [x] The Chat glossary is unchanged
- [x] ADR 0008 follows the ADR format and the numbering in `docs/adr/`
- [x] `pnpm lint` passes

## Comments

- Note: `docs/architecture/adr-index.md` (Generated Doc) does not list ADR 0008 yet; there is no `docs:generate` command until a later ticket, which will regenerate it.
