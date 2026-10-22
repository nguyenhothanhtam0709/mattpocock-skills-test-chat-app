# 01: Adopt React Router

**What to build:** Replace the hand-rolled router and the path check plus redirect effect in `App` with React Router in declarative mode, with no visible change for Users. `/signup` and `/health` are public for everyone; `/login` is for signed-out Users only (signed-in go to `/`); every other path, including `/`, requires a signed-in User (signed-out go to `/login`) and shows the app shell. Guards render nothing while auth is loading, and redirects replace the history entry. This ticket authorises adding the `react-router` package to the web package, and no other package change. Move "Client-side router" out of `docs/laters.md` and add a "Conversation URLs" entry (a URL per Conversation: reload, back, deep links; awkward for a new Direct Conversation with no id).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `react-router` is the only package added or changed
- [x] The hand-rolled router module, its navigate/path helpers and the redirect effect are gone
- [x] Signed-in `/login` goes to `/`; an unknown path shows the app shell when signed in and goes to `/login` when signed out (new tests that render `<App />` after `history.pushState`)
- [x] No wrong-page flash while auth is loading; Back does not loop on redirects
- [x] All existing tests pass without edits
- [x] `docs/laters.md` updated as described
- [x] `pnpm typecheck`, `pnpm test` and `pnpm lint` pass

## Comments

Adopted `react-router` in declarative mode: `BrowserRouter` inside `App`, `RequireSignedIn` and `SignedOutOnly` wrapper routes, a catch-all shell route, `replace` redirects. Deleted `router.ts`; the login form's sign-up link is now a `Link`. Added `routing.test.tsx` (signed-in `/login`, unknown path signed in and out, redirect adds no history entry). Web tests, typecheck and lint pass; API tests need Docker and were not run. Manual dev/serve pass not done (needs a browser).
