# 12: Real-time Message push

**What to build:** While both are online, when one User sends a Message the recipient sees it appear instantly, and a brand-new Direct Conversation pops into their sidebar. The sender's other tabs also update.

**Blocked by:** 08, 09

**Status:** ready-for-agent

- [ ] Socket.IO gateway via the official NestJS adapter: WebSocket transport only, MessagePack parser, per-message deflate
- [ ] Handshake authenticates with the access token in the `auth` payload (signature, expiry, deny-list); failure rejects the connection
- [ ] Each socket joins a per-User room and a per-session room
- [ ] Client-emitted events have no effect (tested) — ADR-0001
- [ ] `message.created` pushed to every Member's User room (including the sender's) after the Message is persisted; `conversation.created` pushed to the recipient when a Direct Conversation is created; payload schemas in contracts
- [ ] Access-token expiry does not disconnect an open socket
- [ ] Socket logging: connect, disconnect with reason, auth failure, each push (event name, target User count, Conversation ID); no payloads
- [ ] App-seam tests use a real `socket.io-client` with the MessagePack parser against the app on a random port
- [ ] SPA: `RealtimeEvents` interface; Socket.IO implementation decodes, validates each event against contracts and drops/logs invalid ones; tested against a real in-test Socket.IO server
- [ ] SPA: incoming `message.created` appends to the open Conversation and updates the sidebar order/preview; `conversation.created` adds the entry; tested with an in-memory `RealtimeEvents` fake
