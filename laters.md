# Laters

Things noticed but deliberately not done now.

## Refresh-token rotation can end a session if a refresh is cancelled mid-flight

- **Seen:** reloading the SPA several times quickly in dev gave 401s (`/auth/refresh` 401, or `/users/me` 401 `SESSION_REVOKED` with a valid token). The user tested it and found it happens only in dev mode (`pnpm dev:web`); it does not happen with the production build (`pnpm serve:web`).
- **Why dev:** `main.tsx` uses `<StrictMode>`, so every mount effect runs twice in dev (`/auth/refresh` and `/conversations` are each sent twice, the first aborted). The extra, aborted refresh can reach the API and rotate the cookie before the page throws the response away.
- **Underlying API behaviour:** `AuthService.refresh` treats a refresh token that was already rotated away as a stolen-token replay and deletes the whole session. Anything that sends a cancelled-then-repeated refresh with the same cookie (dev StrictMode, two tabs reloading together, a client retrying) gets 401 and a dead session. Reproduced against the API alone: send `POST /auth/refresh`, drop the connection without reading the reply, then refresh again with the old cookie: 401.
- **Not done:** no fix, because it is dev-only. If it ever shows up outside dev, the idea is a short grace window on the previous refresh token (the `sessions` table already has `previous_refresh_token_hash` and `rotated_at`), so a cancelled refresh does not end the session while a late replay still does.
- **Workaround:** `pnpm serve:web` builds and serves the production bundle (no StrictMode) at http://localhost:4173.
