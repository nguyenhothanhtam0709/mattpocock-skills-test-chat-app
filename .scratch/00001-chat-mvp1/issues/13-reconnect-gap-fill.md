# 13: Reconnect gap-fill and connection status

**What to build:** If a User's connection drops, they see a "connection lost" notice; when it comes back, any Messages they missed are filled in automatically, so nothing is ever silently missing.

**Blocked by:** 10, 12

**Status:** ready-for-agent

- [ ] Realtime client reconnects automatically and re-authenticates with the current access token
- [ ] On reconnect, the open Conversation is gap-filled via `after=<last seen sequence>`, paging until `hasMore` is false; duplicate Messages from push + fetch are de-duplicated by ID
- [ ] Sidebar Conversation list is refreshed on reconnect
- [ ] SPA shows an `Alert` while disconnected and hides it when reconnected
- [ ] Tests cover: Messages sent while disconnected appear after reconnect exactly once
