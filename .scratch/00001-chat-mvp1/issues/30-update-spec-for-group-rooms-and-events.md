# 30: Update the spec for Group rooms and new events

**What to build:** The spec still says "Pushes target the per-User rooms… Membership changes need no room bookkeeping" and its event catalogue lacks `group.membership_ended`. Tickets 23 and 24 changed this with the user's approval. Bring the spec (and ADR/glossary if affected) in line, and note the other contract additions.

**Blocked by:** none

**Status:** resolved

- [x] Spec describes per-Group rooms and their join/leave rules
- [x] Event catalogue lists `group.membership_ended` and the system-Message `kind`/`subject` fields on Messages, and `isMember` on Conversation summaries
- [x] Spec notes that creating a Group writes no membership notes
- [x] Docs only; no code or package changes

## Comments

- From the second code review (spec axis).

- Spec updated from the shipped contracts (`packages/contracts`) and the comments of tickets 23 and 24. Also added a System Message paragraph to the domain model and a glossary entry; no ADR was affected. No code or package changes.
