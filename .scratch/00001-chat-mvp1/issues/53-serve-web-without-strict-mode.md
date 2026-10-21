# 53: Script to serve the web app without React StrictMode

**What to build:** In dev (`pnpm dev:web`) React StrictMode mounts every component twice, so each API call on load is sent twice (the first aborted). The user wants a way to serve the frontend without StrictMode, to see the app's real request pattern.

**Blocked by:** none

**Status:** resolved

- [x] `pnpm serve:web` (root script) builds the contracts and the web app, then serves the production bundle with `vite preview` (StrictMode has no effect in a production build), proxying `/api` and `/socket.io` to the API like the dev server does
- [x] `packages/web` gets a `preview` script (`vite preview`) that the root script delegates to
- [x] No new package or dependency

## Comments

- Requested by the user while investigating repeated `/auth/refresh` 401s (see `laters.md`).
- Verified: one load against the production bundle sends `/auth/refresh`, `/users/me` and `/conversations` once each (dev sends refresh and conversations twice). The page and `/api/v1/health` through the proxy returned 200.
- Vite preview serves on port 4173 (or the next free port if it is taken).
- Also in this change: `laters.md` (note on the refresh-rotation race, dev-only), ticket 52 (dev switch for the throttler, a dedicated config rather than `NODE_ENV`), and a comment on ticket 46 recording that the composer disappearing after a send reproduces in the production build too.
