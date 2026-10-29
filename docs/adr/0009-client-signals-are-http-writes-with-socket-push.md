# Client signals are HTTP writes with a socket push, durable or ephemeral

ADR [0001](0001-websocket-is-server-push-only.md) makes the socket server-push only. It extends to signals that are not Messages. Every client signal is an HTTP write, validated and rate-limited like any other, followed by a push to the affected rooms. There are two kinds:

- **Durable state** (the Read Marker): the write is persisted first, then pushed, and the HTTP read model (the Conversation list) is the source of truth. A push lost in transit is repaired by the next fetch.
- **Ephemeral signals** (Typing Indicators; Presence later): the write stores nothing and the server relays it. The receiving client owns the expiry, refreshing or dropping the signal on its own timer, so the server needs no timers and no state.

An ephemeral signal that really needs server state (Presence counts connected sockets per User) is the exception, and it has to be written down as in-memory state that blocks scaling out.

## Consequences

- Scaling out ([ADR 0006](0006-api-runs-as-a-single-instance.md)): the Socket.IO Redis adapter carries both kinds with no change to callers. Any in-memory signal state has to move to Redis with it. A stateless relay such as typing has none.
- A signal request is rejected for anyone who is not a current Member (`403 NOT_A_MEMBER`, `404 CONVERSATION_NOT_FOUND` for a never-Member, `GROUP_CLOSED` for a Closed Group), the same as a Message send.
- Each signal gets its own rate limit, separate from the generic 120 / min / User.

## Considered Options

- **Client emits signals over the socket**: rejected, for the reasons in ADR 0001. A second validated, rate-limited, authorized write path would exist only for signals, and it would be the one place a client event is not ignored.
- **Server-held typing timers**: rejected. They add in-memory state, a timer per typist, and a Redis migration for a signal that is safe to lose.
