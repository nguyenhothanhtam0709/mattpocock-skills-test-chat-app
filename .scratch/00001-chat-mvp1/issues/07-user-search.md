# 07: User search

**What to build:** A User opens a "New conversation" dialog, types the start of someone's Username, and sees matching Users (Username and Nickname) to pick from.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Search query `q` 2–32 chars (contracts); prefix match on Username only, case-insensitive
- [ ] `%` and `_` in the query are escaped and treated literally (`a_b` does not match `axb`)
- [ ] Exact Username match ranked first; at most 20 results; the searching User is excluded
- [ ] Results contain ID, Username and Nickname only, never email (asserted against the response schema)
- [ ] Search rate limit 30 / min / User
- [ ] SPA: `Command` inside `Dialog` with server-side results (no client-side filtering), empty and loading states; tested with MSW
