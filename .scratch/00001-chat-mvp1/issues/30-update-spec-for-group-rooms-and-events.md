# 30: Update the spec for Group rooms and new events

**What to build:** The spec still says "Pushes target the per-User rooms… Membership changes need no room bookkeeping" and its event catalogue lacks `group.membership_ended`. Tickets 23 and 24 changed this with the user's approval. Bring the spec (and ADR/glossary if affected) in line, and note the other contract additions.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Spec describes per-Group rooms and their join/leave rules
- [ ] Event catalogue lists `group.membership_ended` and the system-Message `kind`/`subject` fields on Messages, and `isMember` on Conversation summaries
- [ ] Spec notes that creating a Group writes no membership notes
- [ ] Docs only; no code or package changes

## Comments

- From the second code review (spec axis).
