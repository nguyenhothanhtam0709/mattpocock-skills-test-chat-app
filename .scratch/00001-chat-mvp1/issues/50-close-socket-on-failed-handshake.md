# 50: Close the connection when the Socket.IO handshake is unauthorized

**What to build:** A tokenless, invalid or revoked-session handshake is rejected with `connect_error` (`UNAUTHENTICATED` / `SESSION_REVOKED`) by the middleware in `realtime.gateway.ts`, but the underlying Engine.IO connection stays open (WS 101 plus an open packet) until Socket.IO's connect timeout. The user wants the server to close the connection as soon as it rejects the handshake.

**Blocked by:** none

**Status:** resolved

- [x] When `authenticate` fails (any `UNAUTHENTICATED`, `SESSION_REVOKED` or `INTERNAL` result), the client still receives the `connect_error` with the same code, and the server then closes the underlying connection promptly (no lingering transport until the connect timeout)
- [x] A rejected socket still joins no room and receives no events
- [x] Valid handshakes are unaffected (existing realtime tests pass untouched)
- [x] Real-client API tests (the existing `realtime.test.ts` harness): no token, garbage token and a revoked session each get `connect_error` with the right code AND the underlying connection is observed closed shortly after (e.g. `socket.io.engine` `close` event); a valid socket stays connected
- [x] No package changes; server-push-only stays (ADR 0001); the SPA needs no change unless a test shows otherwise (flag it)

## Comments

- Requested by the user after checking that a logged-out client could not get a working socket (it cannot: the handshake is rejected), but "you should reject and close the socket connection if unauthorized".
- Hint, not a requirement: the error packet must be flushed before closing or the client sees a bare disconnect instead of `connect_error`.
- Decision: the gateway middleware now calls `socket.client.conn.close()` from a `setImmediate` after `next(error)`. `socket.disconnect(true)` (the user suggested it) was tried first and is a no-op here: Socket.IO returns early when `!socket.connected`, and this socket never connected. Closing synchronously would also stop Socket.IO sending the `connect_error` packet (it sends on the next tick, only if the connection is still `open`), so the close is deferred. `close()` without discarding drains the write buffer, so the client still gets `connect_error` with the right code first.
- Decision: a real `socket.io-client` closes its own connection after `connect_error`, so it cannot show whether the server closed. The test uses a bare WebSocket (Node's global `WebSocket`) that speaks the Engine.IO and MessagePack Socket.IO packets by hand (`connectRawSocket` in `packages/api/test/socket-client.ts`), reads the `connect_error`, then checks the server closes the connection. No package changes. It failed before the fix (connection still open after 1s) and passes after.
- Flag: the SPA needs no change.
