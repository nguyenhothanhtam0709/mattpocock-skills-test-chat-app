# 09: Conversation list

**What to build:** The sidebar lists all of the User's Conversations, most recently active first, each showing the other person's Nickname or Username, a preview of the last Message and its time. Clicking one opens it.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] List Conversations endpoint for the current User: kind, display name (other User's Nickname or Username for a Direct Conversation), last Message preview and time, sorted by latest Message
- [ ] Only Conversations the User belongs to are listed
- [ ] Get one Conversation endpoint (kind, Members); never-Members get `404`
- [ ] SPA: `SidebarMenu` items with `Avatar` (+ fallback), truncated preview and time; selecting one opens the Conversation view; `Empty` state when none; `Skeleton` while loading; tested
