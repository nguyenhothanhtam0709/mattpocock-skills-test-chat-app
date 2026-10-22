# Spec: Client-side router

Status: resolved

## Problem Statement

The web app has no real router. A hand-rolled `router.ts` and a path check plus a redirect effect in `App` pick the page. It was a stopgap (`docs/laters.md`, "Client-side router") to be replaced once login and the app shell existed. Both are now in, so the stopgap should go.

## Solution

Replace the hand-rolled router with React Router (declarative mode). Users see no change: same URLs (`/signup`, `/login`, `/health`, `/`), same redirects. Routing and the auth guards become declared routes instead of hand-written path matching.

## User Stories

1. As a visitor, I want `/signup` to show the signup page whether or not I am signed in, so that I can create an account.
2. As a visitor, I want `/health` to show the API health page whether or not I am signed in, so that I can check the service.
3. As a signed-out User, I want any other path to send me to `/login`, so that I sign in before using the app.
4. As a signed-out User, I want `/login` to show the login page, so that I can sign in.
5. As a signed-in User, I want `/` to show the app shell with my Conversations, so that I can chat.
6. As a signed-in User, I want `/login` to send me to `/`, so that I never see a login form while signed in.
7. As a signed-in User, I want an unknown path to show the app shell, so that a mistyped URL doesn't strand me.
8. As a User opening a page while the session is being restored, I want to see nothing wrong flash on screen, so that I am not bounced to `/login` and back.
9. As a User, I want the Back button not to return me to a page that just redirects me again, so that Back works.
10. As a User whose session is revoked elsewhere, I want to be signed out and sent to `/login`, so that behaviour stays as today.
11. As a User, I want Log out to land me on `/login`, so that it is clear I am signed out.
12. As a developer, I want auth rules declared as route wrappers, so that adding a page means choosing a wrapper, not editing an effect.
13. As a developer, I want the hand-rolled router and its path check deleted, so that there is one way to navigate.
14. As a developer, I want existing tests to keep passing unchanged, so that I know behaviour did not change.

## Implementation Decisions

- Add the `react-router` dependency to the web package (ticket 01 authorises it).
- Declarative mode: a browser router around the app and `Routes`/`Route`. No data router, loaders or actions.
- Two wrapper routes, both render nothing while auth is loading: one requires a signed-in User (signed-out go to `/login`); one is for signed-out only (signed-in go to `/`).
- `/signup` and `/health` sit outside both wrappers.
- A catch-all route behaves like `/`: the app shell when signed in, `/login` when signed out. No 404 page.
- Redirects replace the history entry.
- The open Conversation stays in app shell state; no per-Conversation URL.
- Delete the hand-rolled router module and the redirect effect.
- Move "Client-side router" out of `docs/laters.md`; add a "Conversation URLs" entry (a URL per Conversation: reload, back, deep links; awkward for a new Direct Conversation with no id).
- No ADR and no `GLOSSARY.md` change: swapping the library is easy to reverse and routing is not domain language.

## Testing Decisions

- A good test sets the browser path, renders the app, and asserts what the User sees and the resulting location, not router internals.
- One seam: render `<App />` after `history.pushState`, with MSW faking the API (as in `login.test.tsx`, `signup.test.tsx`, `app.test.tsx`, `session-revocation.test.tsx`).
- Existing tests stay unchanged and are the regression suite.
- New tests only for uncovered behaviour: signed-in `/login` goes to `/`; unknown path while signed in shows the app shell; unknown path while signed out goes to `/login`.

## Out of Scope

- A URL per Conversation or other deep links.
- A 404 page.
- Data loading via the router, lazy routes, route-level error boundaries.
- Any change to auth, sessions or realtime.

## Further Notes

- `main.tsx` uses `StrictMode`; check dev mode manually (the refresh-rotation entry in `laters.md` is unrelated).
- Verify with `pnpm typecheck`, `pnpm test`, `pnpm lint`, plus a manual pass in `pnpm dev:web` and `pnpm serve:web`.
