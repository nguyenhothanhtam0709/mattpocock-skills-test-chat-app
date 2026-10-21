# The API runs as a single instance

The API is deployed as exactly one process. Two things depend on it:

- **Commit order.** `CommitOrder` (`packages/api/src/messages/commit-order.ts`) uses an in-process `KeyedSerializer` (`packages/api/src/realtime/keyed-serializer.ts`) so that room changes and pushes after a commit on a Conversation happen in commit order. Slot order only equals commit order when every writer of the Conversation shares the same serializer, which is only true inside one process.
- **Room membership.** The Socket.IO per-User and per-Group push rooms are in memory. A push reaches only the sockets connected to the process that emits it.

With two or more instances, two writers of one Conversation could be ordered differently from their commits, and a push emitted on one instance would not reach Members connected to another.

## Scaling out

To run more than one instance, both parts have to change together:

- Add the Socket.IO Redis adapter so rooms and emits span instances.
- Replace the in-process ordering with ordering at the database level (for example, deriving push order from the per-Conversation sequence or an advisory lock held until the push is handed off), so it no longer depends on a shared serializer.

This is out of scope for MVP1 (see the spec and `docs/laters.md`).

## Considered Options

- **Build for multiple instances now**: rejected. It adds Redis and a more complex ordering scheme for a load MVP1 does not have.
