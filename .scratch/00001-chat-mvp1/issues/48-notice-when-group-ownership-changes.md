# 48: Decide whether ownership changes need a visible notice

**What to build:** Found in ticket 45. When the Owner leaves and ownership passes to another Member, the conversation shows only "<name> left"; nothing says who the new Owner is. This may be by design (see the spec and glossary on System Messages).

**Blocked by:** none

**Status:** resolved

- [x] Check the spec and GLOSSARY.md: is an ownership-change notice intended?
- [x] If yes: add it (and update the spec); if no: record the decision in Comments and close as wontfix

## Comments

- From ticket 45's walkthrough. Not implemented without a decision (no assumptions).
- Decision (user): yes, show a visible notice when ownership changes. Implemented as a System Message of kind `owner_changed` ("<name> is now the Owner"), stored right after the leaving Owner's "left" (sender: the leaver, subject: the new Owner), pushed as `message.created` before `group.owner_changed`. Spec (user story 41 already asked for it; System Message section and realtime section) and GLOSSARY.md updated. Migration 0014 widens `messages_kind_check`, generated with `pnpm db:generate`. No package changes.
- Ownership only changes when the Owner leaves (the Owner cannot be removed), so that is the only place the notice is written.
