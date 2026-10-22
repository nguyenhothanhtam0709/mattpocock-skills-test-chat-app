# Laters

Things noticed but deliberately not done now.

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
