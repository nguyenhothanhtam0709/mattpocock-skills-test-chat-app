# Spec: Chat MVP1

Status: ready-for-agent

## Problem Statement

People need a simple, trustworthy way to talk to each other in real time: one-to-one with a specific person, or together with a group of people. Today there is nothing: no way to register, find another User, or exchange Messages. Whatever is built must be safe to run as the foundation of a serious product: every piece of input is validated, identity is real, security basics are in place from day one, and the codebase is built strictly test-first so it can grow without fear.

## Solution

A web chat application consisting of a backend API and a single-page app (SPA).

A person registers as a User (Username, email, password, optional Nickname) and signs in. They can find other Users by Username and start a Direct Conversation simply by sending them a Message, or create a Group, add Members to it, and talk to all of them at once. Messages are plain text, appear in a stable order, and arrive instantly for every online Member via a server-push connection, while the full history remains available over HTTP so nothing is lost when a connection drops. Group Owners manage membership; anyone can leave a Group; Former Members keep read access to what was said while they were in it.

## User Stories

### Registration and sign-in

1. As a visitor, I want to register with a Username, email, and password, so that I can start using the app.
2. As a visitor, I want to optionally set a Nickname when registering, so that other Users see a friendlier name than my Username.
3. As a visitor, I want my Username to keep the capitalization I typed, so that it looks the way I chose.
4. As a visitor, I want to be told when a Username is already taken regardless of capitalization, so that nobody can impersonate an existing User with a look-alike like `alice` vs `Alice`.
5. As a visitor, I want to be told when an email is already registered regardless of capitalization, so that I don't create duplicate identities.
6. As a visitor, I want clear, field-level validation messages on the registration form, so that I can fix mistakes without guessing.
7. As a visitor, I want the registration form to reject a password shorter than 8 or longer than 128 characters, so that my account has a minimally strong password.
8. As a visitor, I want to be rejected if my Username contains characters other than letters, digits, and underscore or is not 3–32 characters long, so that Usernames stay readable and unambiguous.
9. As a User, I want to sign in with either my Username or my email plus my password, so that I can use whichever I remember.
10. As a User, I want sign-in to match my Username or email case-insensitively, so that capitalization doesn't lock me out.
11. As a User, I want a single generic error when sign-in fails, so that attackers cannot learn whether a Username or email exists.
12. As a User, I want to stay signed in across page reloads without re-entering my password, so that the app is convenient.
13. As a User, I want my session to be silently refreshed while I use the app, so that I am not interrupted every few minutes.
14. As a User, I want to log out, so that my session can no longer be used on this device.
15. As a User, I want a logout to take effect immediately, including disconnecting my live connection for that session, so that a stolen token stops working right away.
16. As a User, I want my session to be revoked if someone replays an old refresh token, so that a stolen refresh token cannot be used silently.
17. As a User, I want repeated failed sign-in attempts to be rate limited, so that my account is protected from password guessing.

### Profile

18. As a User, I want to see my own profile (Username, email, Nickname), so that I know how I appear.
19. As a User, I want to change my Nickname, so that I can update how others see me.
20. As a User, I want to clear my Nickname, so that I am shown by my Username only.
21. As a User, I want my Username to be permanent, so that others can always find and recognize me.

### Finding other Users

22. As a User, I want to search for other Users by the start of their Username, so that I can find someone to talk to.
23. As a User, I want search to be case-insensitive, so that I find `Alice` by typing `ali`.
24. As a User, I want an exact Username match to be ranked first, so that I find the person I mean quickly.
25. As a User, I want search results to show Username and Nickname but never email, so that other Users' private data is protected.
26. As a User, I want search not to return myself, so that I don't accidentally start a conversation with myself.
27. As a User, I want an underscore in my search to be treated literally, so that `a_b` only matches Usernames starting with `a_b`.

### Direct Conversations

28. As a User, I want to send a Message to another User by picking them from search, so that I can talk one-to-one.
29. As a User, I want the Direct Conversation to be created automatically by my first Message, so that I don't have to "create" a chat first.
30. As a User, I want there to be only one Direct Conversation between me and any other User, so that our history is in one place.
31. As a User, I want to be prevented from messaging myself, so that I don't create a meaningless conversation.
32. As a User, I want to be notified in real time when someone starts a Direct Conversation with me, so that it appears in my list immediately.

### Groups

33. As a User, I want to create a Group with a name and an initial set of Members, so that I can talk to several people at once.
34. As the creator of a Group, I want to become its Owner, so that I can manage its membership.
35. As an Owner, I want to add a User to my Group, so that they can join the discussion.
36. As an Owner, I want to remove a Member from my Group, so that I can control who participates.
37. As a User, I want to be notified in real time when I am added to a Group, so that it appears in my list immediately.
38. As a Member, I want to see when Members are added, removed, or leave, so that I know who can read what I write.
39. As a Member, I want to leave a Group, so that I stop receiving its Messages.
40. As an Owner, I want ownership to pass automatically to the longest-standing Member when I leave, so that the Group is never left unmanaged.
41. As a Member, I want to be notified when the Owner changes, so that I know who manages the Group.
42. As the last Member of a Group, I want leaving to close the Group, so that no one can post into an empty Group.
43. As a Former Member, I want to still read the Messages sent while I was a Member, so that I keep the context of past discussions.
44. As a Former Member, I want to not see any Message sent after I left, so that the Group's privacy is respected.
45. As a newly added Member, I want to see only Messages sent after I joined, so that earlier private discussion stays private.
46. As a Former Member who is added back, I want to see Messages from each period I was a Member, but not from the gap in between, so that history rules stay consistent.
47. As an Owner, I want adding Members to stop at 256, so that Groups stay within a manageable size.
48. As a Member who is not the Owner, I want to be prevented from adding or removing Members, so that only the Owner manages membership.
49. As a User, I want a Closed Group to reject new Messages and new Members, so that it stays a read-only record.
50. As a User, I want Group names to be 1–100 characters after trimming, so that names are meaningful and fit the UI.

### Messaging

51. As a Member, I want to send a plain-text Message to a Conversation, so that I can communicate.
52. As a Member, I want my Message to keep exactly the text I typed, including line breaks, `<`, `>`, and other symbols, so that what others read is what I wrote.
53. As a Member, I want empty or whitespace-only Messages to be rejected, so that Conversations aren't cluttered.
54. As a Member, I want Messages longer than 4000 characters to be rejected with a clear message, so that I know the limit.
55. As a Member, I want my Message to appear immediately in a pending state, so that the app feels fast.
56. As a Member, I want a failed Message to be marked with a retry action, so that I can resend it without retyping.
57. As a Member, I want retrying a send never to create a duplicate Message, so that flaky networks don't spam the Conversation.
58. As a Member, I want Messages in a Conversation to always be in the same order for everyone, so that the discussion makes sense.
59. As a Member, I want Messages I send to also appear on my other open tabs and devices, so that my view is consistent everywhere.
60. As a Member, I want to receive new Messages instantly while I am online, so that conversation feels live.
61. As a Member, I want any Messages I missed while disconnected to be filled in when I reconnect, so that I never silently miss anything.
62. As a Member, I want sending to be rate limited only well above normal typing speed, so that I'm not blocked while spam is.
63. As a non-Member, I want to be unable to read or post to a Conversation I'm not part of, so that Conversations stay private.

### Conversation list and history

64. As a User, I want to see all my Conversations (Direct Conversations and Groups, including ones I'm a Former Member of) sorted by latest Message, so that active discussions are on top.
65. As a User, I want each entry to show the other person's Nickname or Username (or the Group name), the last Message preview, and its time, so that I can tell Conversations apart at a glance.
66. As a User, I want to open a Conversation and see its most recent Messages, so that I can catch up.
67. As a User, I want older Messages to load as I scroll up, without my view jumping, so that I can read history comfortably.
68. As a User, I want Messages grouped by sender and separated by day, so that long histories are easy to scan.
69. As a User, I want system notes like "Bob was added" shown inline, so that I understand membership changes in context.
70. As a User, I want a "jump to latest" control when I've scrolled up, so that I can return to the live edge.
71. As a User, I want a helpful empty state when I have no Conversations or a Conversation has no Messages, so that I know what to do next.

### SPA experience

72. As a User, I want the composer to send on Enter and insert a newline on Shift+Enter, so that typing feels natural.
73. As a User, I want a character counter as I approach the Message limit, so that I'm not surprised by a rejection.
74. As a User, I want a Group details panel listing Members and the Owner, so that I know who is in the Group.
75. As an Owner, I want add/remove actions in the Group details panel with confirmation before removal, so that I don't remove someone by accident.
76. As a Member, I want a Leave action with confirmation, so that I don't leave by accident.
77. As a User, I want light and dark themes, so that the app is comfortable in any environment.
78. As a mobile User, I want the Conversation list to slide over the Conversation view, so that the app works on a small screen.
79. As a User, I want a visible notice when my live connection is lost, so that I know Messages may be delayed.
80. As a User, I want to be returned to the sign-in screen if my session is revoked elsewhere, so that the app never pretends I'm still signed in.

### Operator / developer

81. As an operator, I want the app to refuse to start with invalid configuration, so that misconfiguration is caught immediately.
82. As an operator, I want a health endpoint that checks the database, so that I can tell whether the service is working.
83. As an operator, I want every HTTP request, Socket.IO lifecycle event and push, and database query logged with a request ID and User ID, so that I can trace what happened.
84. As an operator, I want slow database queries logged as warnings, so that I notice performance problems.
85. As an operator, I want logs sent to the console, a rotating file, or both, configured by environment, so that I can fit any deployment.
86. As an operator, I want passwords, tokens, cookies, emails, and Message bodies never to appear in logs, so that logs are safe to share.
87. As an operator, I want standard security headers, a strict Content-Security-Policy, and CORS limited to the SPA origin, so that common web attacks are mitigated.
88. As a developer, I want every error response to have the same shape with a stable machine-readable code from a shared enum, so that clients can handle errors reliably.
89. As a developer, I want request, response, and push-event shapes defined once and shared by the API and the SPA, so that both sides validate against the same rules.
90. As a developer, I want every behaviour to be introduced by a failing test first, so that the system stays correct as it grows.

## Implementation Decisions

### Architecture and repository

- pnpm workspace monorepo with three packages: the **API** (NestJS), the **web** SPA (React), and **contracts** (shared Zod schemas, inferred types, the `ErrorCode` enum, and push-event definitions). Contracts is the single source of truth for every payload shape crossing a boundary.
- Node 24, native ESM throughout, TypeScript strict mode. Confirm NestJS 12 ESM support while scaffolding.
- Single server process, single PostgreSQL database for MVP1; no horizontal scaling. Design choices (UUIDv7 IDs, per-Conversation sequence, per-User push rooms, ports for stores) are made so that scaling/sharding by Conversation later is not blocked.
- ESLint + Prettier. Lint rules ban `dangerouslySetInnerHTML` in application code and any import of `class-validator` / `class-transformer`.
- Local Postgres via a docker-compose file.

### Backend stack

- NestJS with the official Fastify adapter. Prefer first-party NestJS packages and the Fastify plugins the NestJS docs recommend.
- Drizzle ORM for schema and migrations, with the `pg` driver (Pool).
- Zod for all validation via a project-owned `ZodValidationPipe` (following the NestJS docs pattern), not a third-party Nest/Zod integration. One validation mechanism only.
- Configuration through `@nestjs/config` with a Zod schema in its validate hook; the app refuses to boot on invalid config.

### Validation and normalization (ADR-0002)

- Boundary validation: every HTTP body, param, query string, and every pushed event (on the client) is parsed against a contracts schema. Invalid input returns `400` with `VALIDATION_FAILED` and Zod issues in `details`; it never reaches domain logic.
- Domain invariants needing state (uniqueness, membership, ownership, Group size, Closed Group) are enforced server-side with dedicated error codes, and backed by database constraints where possible.
- Input is never sanitized or rewritten. Allowed normalizations only: Unicode NFC on all text; trim on Nickname and Group name. Username and email are stored exactly as typed (no lowercasing) and compared case-insensitively.
- Reject NUL and C0/C1 control characters everywhere, except newline and tab in Message bodies. Reject bidi-override characters (U+202A–U+202E, U+2066–U+2069) in Username, Nickname, and Group name.
- Field rules:
  - Username: 3–32 characters, letters/digits/underscore, immutable, unique case-insensitively.
  - Email: valid email format, unique case-insensitively, no verification in MVP1.
  - Password: 8–128 characters, hashed with argon2id.
  - Nickname: optional, 1–50 characters after trimming, editable, not unique.
  - Group name: 1–100 characters after trimming, not unique.
  - Message body: plain text, max 4000 characters, rejected if empty after trimming but stored untrimmed.
- Responses are validated against contracts schemas in tests only, not at runtime. Data read from the database is not re-validated at runtime.

### Identity and sessions

- Access token: JWT signed with EdDSA (Ed25519, key pair from config) via `@nestjs/jwt`, lifetime ~15 minutes. Claims: `sub` (User ID), `sid` (session ID), `jti`, `iat`, `exp`. Held only in SPA memory.
- Refresh token: opaque random value in an `httpOnly`, `Secure`, `SameSite=Strict` cookie (via `@fastify/cookie`), stored hashed in a sessions table, rotated on every refresh. Presenting an already-rotated refresh token revokes the whole session (reuse detection).
- Logout: the access token's `jti` is added to the deny-list until its expiry, the session is revoked, and a `session.revoked` event is pushed to that session's sockets, which are then disconnected.
- **Token deny-list as a port/adapter**: a `TokenDenyList` port (add with expiry, check, sweep expired) with a Postgres adapter for MVP1; a Redis adapter can be added later without touching callers. Checked on every authenticated HTTP request and on socket handshake.
- Sign-in accepts Username or email plus password and returns one generic `INVALID_CREDENTIALS` error for any failure, doing comparable hashing work whether or not the User exists.
- Access-token expiry does not close an open socket; only session revocation does.
- An injectable clock is used for all time-dependent logic (token expiry, rotation, sweeps).

### Domain model

- All entity IDs are UUIDv7, generated server-side.
- A **Conversation** is either a **Direct Conversation** or a **Group**.
- Direct Conversation: exactly two distinct Users, at most one per pair (enforced by a uniqueness constraint over the normalized pair), created implicitly by the first Message. Messaging yourself is rejected.
- Group: has a name, exactly one **Owner**, at most 256 Members including the Owner. Membership is recorded as membership periods (joined at sequence/time, left at sequence/time), so a User may have several periods in one Group.
  - Any User can create a Group and becomes its Owner; initial Members can be supplied at creation.
  - Only the Owner adds or removes Members; adding is immediate (no invitation). The Owner cannot remove themselves; they leave instead.
  - Any Member can leave. If the Owner leaves, ownership passes to the Member with the longest current membership period. If the last Member leaves, the Group becomes a **Closed Group** permanently.
  - A User sees only Messages whose sequence falls within one of their membership periods. A **Former Member** keeps that read access. Re-adding a Former Member opens a new period; the gap stays hidden.
  - A Closed Group rejects new Messages and new Members.
- **Message**: immutable plain text, belongs to exactly one Conversation, has a sender, a server-assigned per-Conversation sequence number, a server timestamp, and the sender's client message ID.
- Sequence assignment: each Conversation holds a last-sequence counter; sending increments it and inserts the Message within one transaction (row-locked), so `(conversation, sequence)` is unique and strictly increasing. Client clocks are never trusted.
- Idempotency: `(sender, client message ID)` is unique. Re-sending with the same client message ID returns the original Message with `200` instead of `201`.

### HTTP API contract

All routes are under `/api/v1`, JSON bodies use camelCase, and timestamps are ISO-8601 UTC strings.

- Auth: register, login, refresh, logout.
- Current User: get profile, update Nickname (set or clear).
- User search: `q` (2–32 chars), Username prefix match only, case-insensitive, `%` and `_` escaped, exact match ranked first, max 20 results, excludes the searcher, returns ID + Username + Nickname only.
- Direct send: send a Message to a User (by User ID), creating the Direct Conversation if needed. Returns the Message and Conversation.
- Conversations: list the current User's Conversations (including ones they are a Former Member of), sorted by latest Message, each with display name, kind, last Message preview, and time. Get one Conversation (Members, Owner, closed flag).
- Messages:
  - Send to an existing Conversation.
  - History with `before=<sequence>` (scroll up, newest first) or `after=<sequence>` (gap fill, oldest first). `limit` 1–100, default 10. Responses include `hasMore`.
  - All reads are restricted to the caller's membership periods.
- Groups: create (name + initial Member IDs), add Member, remove Member, leave.
- Health: unauthenticated, checks the database.
- Never-Members asking about a Conversation get `404 CONVERSATION_NOT_FOUND`, so existence is not leaked. Former Members trying to post get `403 NOT_A_MEMBER`.

### Error contract

- Every error body has the shape `{ error: { code, message, details? } }`.
- `code` is a string-valued `ErrorCode` enum defined in contracts and shared with the SPA. Initial members:
  - `VALIDATION_FAILED`
  - `UNAUTHENTICATED`
  - `SESSION_REVOKED`
  - `INVALID_CREDENTIALS`
  - `USERNAME_TAKEN`
  - `EMAIL_TAKEN`
  - `USER_NOT_FOUND`
  - `CONVERSATION_NOT_FOUND`
  - `NOT_A_MEMBER`
  - `NOT_GROUP_OWNER`
  - `ALREADY_A_MEMBER`
  - `GROUP_FULL`
  - `GROUP_CLOSED`
  - `CANNOT_MESSAGE_SELF`
  - `RATE_LIMITED`
  - `INTERNAL_ERROR`
- Clients and tests branch on `code`, never on `message`.

### Real-time push (ADR-0001)

- Socket.IO via the official NestJS Socket.IO adapter, WebSocket transport only (no long-polling fallback), MessagePack parser, and per-message deflate.
- The socket is **server-push only**: all writes go through HTTP, and any client-emitted event is ignored.
- Authentication uses the access token in the Socket.IO handshake `auth` payload, checked against signature, expiry, and the deny-list. Failure rejects the connection.
- Each socket joins a per-User room and a per-session room. Pushes target the per-User rooms of the relevant Members. Membership changes need no room bookkeeping.
- Messages are persisted before they are pushed. Push is best-effort; clients recover gaps with the `after=<sequence>` history query on reconnect.
- Event catalogue (payload schemas live in contracts):
  - `message.created`
  - `conversation.created`
  - `group.member_added`
  - `group.member_removed`
  - `group.member_left`
  - `group.owner_changed`
  - `group.closed`
  - `session.revoked`
- No `user.updated` event in MVP1.

### Security baseline

- `@fastify/helmet` with a strict Content-Security-Policy and standard headers.
- CORS enabled only for the configured SPA origin, with credentials.
- XSS is handled by encoding output, not sanitizing input: the SPA renders all user text as text, backed by the CSP and the lint ban (ADR-0002).
- CSRF is covered by the `SameSite=Strict` refresh cookie plus the in-memory access token; no CSRF package.
- Rate limiting via `@nestjs/throttler` with in-memory storage, responding `429 RATE_LIMITED` with `Retry-After`. Limits:

  | Action | Limit |
  |---|---|
  | Register | 5 / hour / IP |
  | Login | 10 / 15 min / IP and 5 / 15 min / identifier |
  | User search | 30 / min / User |
  | Message send | 30 / 10 s / User |
  | All other requests | 120 / min / User |

### Logging

- One pino instance, used two ways: wrapped in a `PinoLoggerService` that implements Nest's `LoggerService` and is installed as the app logger (with log buffering at boot), and passed to the Fastify adapter as its logger.
- Request context (request ID, User ID) is carried via AsyncLocalStorage and attached to every line, including database query logs.
- Transports are configurable through validated env: console (JSON, or pretty when enabled) and/or file (rotating via `pino-roll`, with path, max size, frequency, retention). Each target can have its own level, falling back to a global level.
- What gets logged:
  - **HTTP**: one line per request with method, route, status, duration, request ID, User ID, and IP. No bodies; `authorization` and `cookie` headers are redacted.
  - **Socket**: connect, disconnect (with reason), auth failure, and each push (event name, target User count, Conversation ID). No payloads.
  - **Database**: SQL text and duration at debug level, never bound parameters. Queries slower than 200 ms are logged at warn regardless of level. Timing comes from wrapping the pool's query path.
- Passwords, tokens, cookies, emails, and Message bodies are never logged, enforced with pino `redact` paths and by tests.

### SPA

- React + Vite + TypeScript, shadcn/ui on the Base UI primitives, `nova` style, lucide icons. Components live inside the web app (no separate shared UI package).
- Screens and composition (chat UI uses the shadcn chat primitives, never hand-rolled bubbles or scroll containers):
  - **Register / Login**: start from the shadcn signup/login blocks, without the forgot-password and social login links. Forms use `Field` with field-level Zod errors.
  - **App shell**: `Sidebar`, which becomes a slide-over `Sheet` on mobile. The Conversation list is `SidebarMenu` items with `Avatar`, a truncated preview, and time. The footer holds a User menu (Profile, theme, Log out).
  - **Conversation view**:
    - Message list: the `MessageScroller` family, with `MessageScrollerButton` for jump-to-latest.
    - Messages: `MessageGroup` and `Message` (own Messages on the end side), `Bubble`.
    - Day dividers and membership notes: `Marker`.
    - Pending and failed Messages: `muted` and `destructive` Bubble variants, with a retry action that reuses the original client message ID.
  - **Composer**: `InputGroup` with a textarea, a character counter, and a send button. Enter sends, Shift+Enter inserts a newline.
  - **New Direct Conversation / add Member**: `Command` inside `Dialog`, backed by server-side Username prefix search.
  - **New Group**: `Dialog` with a name field and Member picker.
  - **Group details**: `Sheet` with a Member list, Owner actions, and `AlertDialog` confirmations for remove and leave.
  - **Profile**: `Dialog` to edit the Nickname.
  - **States**: `Empty`, `Skeleton`, an `Alert` for a lost connection, and toasts for transient errors.
  - Light and dark theme.
- Realtime is consumed through a `RealtimeEvents` interface that emits already-decoded, contracts-validated events. The Socket.IO implementation connects with the access token, decodes MessagePack, validates each event against contracts (dropping and logging invalid ones), and reconnects.
- On reconnect, the SPA gap-fills each open Conversation with `after=<last seen sequence>`. On `session.revoked` or an unrecoverable `401`, it clears auth state and returns to sign-in.
- The access token is held in memory and refreshed via the refresh cookie on load and before expiry.

## Testing Decisions

- **Strict TDD**: no production code without a failing test first, one behaviour at a time (red → green → refactor). No coverage target, and no CI in MVP1. All tests must pass locally before a PR is opened.
- **Good tests check external behaviour only**: they drive the system through its public seam and assert on observable outcomes (status codes, error `code`s, response bodies validated against contracts, pushed events, rendered UI). They never reach into private modules, providers, repositories, or component internals, so modules can be refactored freely. Tests assert on `ErrorCode`, never on message text.
- **Seams** (agreed; keep them few and high):
  1. **Backend app seam (primary)**: the real Nest app booted in-process against a real Postgres (Testcontainers, migrations applied once per run, all tables truncated between tests). HTTP goes through Fastify's `inject()`. Socket.IO behaviour is tested with a real `socket.io-client` (MessagePack parser) against the app listening on a random port. Every domain rule is tested here: membership, Owner transfer, Closed Group, Former Member history windows, idempotency, sequence order, rate limits, auth and deny-list, error contract, and logging. Rate limits are real but lowered in test config.
  2. **Contracts seam**: the shared Zod schemas are tested directly, with exhaustive edge cases for every field rule, normalization, and control/bidi rejection. API tests then check only the wiring (per endpoint, one invalid input returns `VALIDATION_FAILED` with `details`).
  3. **`TokenDenyList` port contract suite**: one shared behavioural suite (add, check, expiry, sweep) run against every adapter (Postgres now, Redis later).
  4. **SPA seam**: the full app rendered with Testing Library, interacting like a user by role and label. HTTP is mocked at the network level with MSW. Push events come from an in-memory fake implementation of `RealtimeEvents`.
  5. **Realtime client seam**: the Socket.IO implementation of `RealtimeEvents` is tested against a real in-test Socket.IO server (decode, validate, drop invalid, reconnect).
- **Test-time overrides** (the only ones allowed in the app seam):
  - an injectable clock, for token expiry, rotation, and sweeps without sleeping or fake global timers;
  - an in-memory log destination, to assert what is logged and that secrets and Message bodies never are.
- **Required behaviours to cover explicitly**:
  - logging in leaves no trace of the password in captured logs;
  - a retried send is idempotent;
  - concurrent sends to one Conversation get distinct, increasing sequences;
  - Former Member and re-added Member history windows;
  - refresh-token reuse revokes the session;
  - logout disconnects that session's sockets;
  - client-emitted socket events have no effect;
  - loading older history in the SPA does not jump the scroll position.
- **Prior art**: none. This is a greenfield repo; the first slices set the patterns for each seam.

## Out of Scope

- Read receipts, unread counts, typing indicators, and presence (online/offline).
- Message edit, delete, reactions, replies/threads, attachments, and rich text/markdown.
- Message search; User search by Nickname or substring.
- Email verification, password reset, password change, account deletion, Username change.
- Contacts, friend requests, blocking, and reporting.
- Group roles beyond Owner (admins/moderators), invitations requiring acceptance, Group renaming or deletion.
- Pushing Nickname changes in real time (`user.updated`).
- Horizontal scaling, Redis, sharding, and multi-instance Socket.IO adapters.
- CI pipelines, deployment, OpenAPI/Swagger docs.
- Native mobile apps.

## Further Notes

- Domain language is defined in `GLOSSARY.md`; use its terms (User, Username, Nickname, Conversation, Direct Conversation, Group, Closed Group, Member, Owner, Former Member, Message) in code, tests, and issues.
- Respect ADR-0001 (WebSocket is server-push only) and ADR-0002 (validate on input, encode on output; no input sanitizer).
- Two decisions were not discussed but were settled while writing this spec:
  - A Former Member who is re-added gets a new membership period, and the gap stays hidden.
  - Never-Members get `404` rather than `403` for Conversations, so existence is not leaked.
- Proposed vertical slicing for issues, each one a branch and PR, in order:
  1. Monorepo and tooling skeleton
  2. Config, logging, and security baseline
  3. Register
  4. Login, refresh, and logout with the deny-list
  5. User search
  6. Direct Conversation and sending Messages
  7. History and pagination
  8. Socket.IO push
  9. Groups (create, add/remove Members, leave, Owner transfer, close)
  10. SPA shell and auth screens
  11. SPA chat UI
- The git workflow forbids commits to `main`; every slice lands through a PR reviewed and merged by a human.
