# Laters

Notes for a later MVP, not commitments. Any agent may append an entry. Remove an entry when it becomes a spec.

## Conversation URLs

A URL per Conversation, so reload, Back and deep links work. Today the open Conversation lives in app shell state. Awkward for a new Direct Conversation, which has no id until the first Message is sent.

## Contract-first development

Today `packages/contracts` (Zod) is shared by the API and SPA, but endpoints are built code-first and there are no generated API docs (OpenAPI is out of scope for MVP1). In a later MVP, move to contract-first: define the HTTP contract (request, response and error shapes) before the implementation, and drive the API and SPA from it. Decide the contract format (extending the Zod contracts vs. OpenAPI) in an ADR when this is picked up.

## Scale out the API

The API runs as a single instance (ADR [0006](adr/0006-api-runs-as-a-single-instance.md)): commit ordering uses an in-process serializer and Socket.IO rooms are in memory. To run more than one instance, add the Socket.IO Redis adapter and move ordering to the database. Turn that into a spec before starting.

## Refresh-token rotation can end a session if a refresh is cancelled mid-flight

- **Seen:** reloading the SPA several times quickly in dev gave 401s (`/auth/refresh` 401, or `/users/me` 401 `SESSION_REVOKED` with a valid token). The user tested it and found it happens only in dev mode (`pnpm dev:web`); it does not happen with the production build (`pnpm serve:web`).
- **Why dev:** `main.tsx` uses `<StrictMode>`, so every mount effect runs twice in dev (`/auth/refresh` and `/conversations` are each sent twice, the first aborted). The extra, aborted refresh can reach the API and rotate the cookie before the page throws the response away.
- **Underlying API behaviour:** `AuthService.refresh` treats a refresh token that was already rotated away as a stolen-token replay and deletes the whole session. Anything that sends a cancelled-then-repeated refresh with the same cookie (dev StrictMode, two tabs reloading together, a client retrying) gets 401 and a dead session. Reproduced against the API alone: send `POST /auth/refresh`, drop the connection without reading the reply, then refresh again with the old cookie: 401.
- **Not done:** no fix, because it is dev-only. If it ever shows up outside dev, the idea is a short grace window on the previous refresh token (the `sessions` table already has `previous_refresh_token_hash` and `rotated_at`), so a cancelled refresh does not end the session while a late replay still does.
- **Workaround:** `pnpm serve:web` builds and serves the production bundle (no StrictMode) at http://localhost:4173.

## `owner_changed` System Message in the Conversation preview and list ordering

- **Seen:** ticket 48 added the `owner_changed` System Message kind. The spec says System Messages stay out of the Conversation preview and list ordering, but the 48 diff did not touch that code, so it relies on the existing kind-based filtering. Nobody checked it, and no test covers it for this kind.
- **Not done:** no check or test yet.
- **Idea:** add a test (API) that an `owner_changed` message does not become the preview or move the Conversation in the list, or confirm the filter is by `kind` for every System Message.

## Mobile sidebar sheet stays open after picking a Conversation

- **Seen:** while verifying ticket 46 at 375x667 with touch emulation, choosing a Conversation in the sidebar sheet left the sheet open until Escape was pressed.
- **Not done:** not ticketed, and not part of ticket 46.
- **Idea:** close the sheet when a Conversation is selected on mobile.

## Throttler route strings are duplicated away from the controllers

- **Seen:** in the spec 00002 code review. `throttling/throttling.module.ts` hard-codes `SEARCH_URL`, `SEND_URLS` and `/api/v1/auth/login`, separate from the controllers that define those routes. Renaming a route or the global prefix would silently switch the matching limit off, and no test ties the strings to the real routes.
- **Not done:** spec 00002 said to move the limits and route rules unchanged, so this was left as it was.
- **Idea:** derive the throttler routes from the controllers' route metadata, or add a test that each limited route is actually limited.

## Enforce the doc and convention rules

The doc and convention rules are not enforced yet; agents follow them by reading. Enforcement to build in a later MVP:

- **Enforcement tags:** tag each rule with how it is enforced, and apply "broken twice, automate it": once a rule is broken a second time, replace the prose with an automated check.
- **Required CI checks:** lint, typecheck, tests with Postgres, migration drift, generated-doc drift, and a front matter and link check. Back them with branch protection and a required human approval.
- **`covers:` check:** a PR that touches code covered by a Descriptive Doc without updating that doc fails, unless the PR body justifies it.
- **Stop hook:** run the fast checks when the agent stops.
- **Merge permission:** remove the agent's pre-approved PR merge permission.
- **Drift audit:** a periodic audit of docs against code that opens Tickets for each drift found.

## Review the mocks in tests

- **Seen:** while extracting conventions (spec 00004, ticket 05). `docs/conventions/general.md` says to test through public seams and to mock only where no seam exists. Four files use `vi.mock` or `vi.spyOn`: `api/src/groups/group-rooms.test.ts`, `api/src/db/database.module.test.ts`, `web/src/realtime/socket-realtime.test.ts` and `web/src/history-pagination.test.tsx`.
- **Not done:** nobody checked whether each mock is needed.
- **Idea:** for each file, switch to a public seam or note why there is none.

## The one `any` in the API

- **Seen:** while extracting conventions (spec 00004, ticket 05). `api/src/messages/message-rows.ts:11` turns off `@typescript-eslint/no-explicit-any` for the `Tx` type, with a comment saying why.
- **Not done:** left as it is.
- **Idea:** type `Tx` without `any`, or keep the disable and its comment as the accepted exception.

## One shared uuid path pipe in the API

- **Seen:** while extracting conventions (spec 00004, ticket 05). The same `new ZodValidationPipe(z.uuid())` is declared twice: `IdPipe` in `api/src/groups/groups.controller.ts` and `ConversationIdPipe` in `api/src/messages/messages.controller.ts`.
- **Not done:** left as two copies.
- **Idea:** export one uuid path pipe from `api/src/common/` and use it in both controllers.

## API tests redefine `signUp`

- **Seen:** while extracting conventions (spec 00004, ticket 05). `docs/conventions/api.md` says test Users come from `signUp` in `api/test/people.ts`. Four files keep a local copy: `api/src/messages/messages.test.ts`, `api/src/groups/groups.test.ts`, `api/src/realtime/realtime.test.ts` and `api/src/auth/user-search.test.ts`.
- **Not done:** test-only cleanup, no behaviour change.
- **Idea:** switch those four files to the shared helper, and add anything they need to it.

## Web cleanups found while extracting conventions

- **Seen:** while extracting conventions (spec 00004, ticket 05), against `docs/conventions/web.md`:
  - `web/src/realtime/socket-realtime.test.ts` imports `../test/server`, the only upward relative import. It should use `@/test/server`.
  - `web/src/shell/NewGroupDialog.tsx:68` renders a raw `<button>` inside a `Badge`, the only raw control outside `components/ui`. It should be the shadcn `Button`; check how it looks after the change.
- **Not done:** small and outside ticket 05.
- **Idea:** fix both in one small Ticket.

## Shared request helper for the web API client

- **Seen:** while extracting conventions (spec 00004, ticket 05). Seven files in `web/src/api/` (`auth.ts`, `conversations.ts`, `groups.ts`, `messages.ts`, `profile.ts`, `register.ts`, `users.ts`) repeat the fetch, try and catch block and the strings "Could not reach the server. Try again." and "Something went wrong. Try again." `groups.ts` also declares them as constants and `messages.ts` has its own `post` helper. `api/health.ts` throws instead of returning an `{ ok, ... }` union.
- **Not done:** an eight-file refactor with no visible change.
- **Idea:** one request helper in `web/src/api/` that owns the fetch, the error strings and the union, used by every endpoint function, including `health.ts`.

## Shared test people in web tests

- **Seen:** while extracting conventions (spec 00004, ticket 05). Each web test file (`routing.test.tsx`, `login.test.tsx`, `profile.test.tsx`, ...) redefines its own `alice` user and fake access token.
- **Not done:** test-only cleanup.
- **Idea:** a helper in `web/src/test/`, mirroring `api/test/people.ts`.

## Contracts cleanups found while extracting conventions

- **Seen:** while extracting conventions (spec 00004, ticket 05), against `docs/conventions/contracts.md`:
  - `SearchUsersQuery` (`contracts/src/user.ts:132`) uses `z.input`, but only the API uses it, after parsing, so it should be `z.infer`. Harmless today because the schema has no transform.
  - `contracts/src/search.test.ts` tests schemas from `user.ts`, with no `search.ts` beside it. `contracts/src/code-point.ts` has no test of its own.
- **Not done:** small and outside ticket 05.
- **Idea:** switch the type to `z.infer`, merge `search.test.ts` into `user.test.ts`, and test `code-point.ts` directly or through the schemas that use it.
