# The WebSocket is a server-push-only channel

Clients perform every write (sending Messages, managing Groups, auth) over HTTP; the WebSocket (Socket.IO) only carries events from server to client, and any client-emitted event is ignored. This gives a single validated write path, lets HTTP provide idempotency, auth, and status codes for free, and keeps the socket layer trivial to scale out later. Push is best-effort: Messages are persisted before being pushed, and clients recover gaps by fetching history over HTTP.

## Considered Options

- **Bidirectional socket (send over WS)**: rejected; it duplicates validation, auth, and error semantics in a second protocol and makes retries/idempotency ad hoc.
- **Server-Sent Events**: rejected; text-only, so pushed payloads can't be binary-encoded and compressed.
