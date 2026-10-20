# 12: Real-time Message push

**What to build:** While both are online, when one User sends a Message the recipient sees it appear instantly, and a brand-new Direct Conversation pops into their sidebar. The sender's other tabs also update.

**Blocked by:** 08, 09

**Status:** resolved

- [x] Socket.IO gateway via the official NestJS adapter: WebSocket transport only, MessagePack parser, per-message deflate
- [x] Handshake authenticates with the access token in the `auth` payload (signature, expiry, deny-list); failure rejects the connection
- [x] Each socket joins a per-User room and a per-session room
- [x] Client-emitted events have no effect (tested) — ADR-0001
- [x] `message.created` pushed to every Member's User room (including the sender's) after the Message is persisted; `conversation.created` pushed to the recipient when a Direct Conversation is created; payload schemas in contracts
- [x] Access-token expiry does not disconnect an open socket
- [x] Socket logging: connect, disconnect with reason, auth failure, each push (event name, target User count, Conversation ID); no payloads
- [x] App-seam tests use a real `socket.io-client` with the MessagePack parser against the app on a random port
- [x] SPA: `RealtimeEvents` interface; Socket.IO implementation decodes, validates each event against contracts and drops/logs invalid ones; tested against a real in-test Socket.IO server
- [x] SPA: incoming `message.created` appends to the open Conversation and updates the sidebar order/preview; `conversation.created` adds the entry; tested with an in-memory `RealtimeEvents` fake

## Comments

- The user approved these packages for this ticket (the ticket named the technologies but not the packages): `packages/api` gets `@nestjs/websockets`, `@nestjs/platform-socket.io` (brings `socket.io`) and `socket.io-msgpack-parser`, plus `socket.io-client` as a devDependency; `packages/web` gets `socket.io-client` and `socket.io-msgpack-parser`.
- The web test for the Socket.IO `RealtimeEvents` implementation needs a real in-test Socket.IO server, but `socket.io` is not a `packages/web` dependency and was not on the approved list. It loads `socket.io` and the parser from `packages/api` via `createRequire` instead of adding a package. Say if you would rather add `socket.io` as a `packages/web` devDependency.
- Assumptions: `conversation.created` carries the recipient's `ConversationSummary` (as in `GET /conversations`); a Message pushed for a Conversation the SPA does not list (the sender's other tab) makes it reload the list; resending a Message with the same client message ID pushes nothing.
