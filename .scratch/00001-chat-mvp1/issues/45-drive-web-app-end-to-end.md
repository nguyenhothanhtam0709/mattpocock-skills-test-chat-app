# 45: Drive the web app end to end in a browser

**What to build:** Ticket 39's end-to-end check ran a script against the real API, Postgres and Socket.IO but did not drive the browser UI.

**Blocked by:** none

**Status:** resolved

- [x] Launch the app (the `run` skill) and walk the main flows through the UI: register/login, Direct message, create Group, add/remove Member, leave, Former Member view, Closed Group, logout
- [x] Report or fix what breaks (ask before behaviour changes)

## Comments

- From the final code review of tickets 38-40 (spec axis). Note the API register rate limit (5 per hour per IP) when repeating runs.
- Attempted 2026-10-21 by an agent. No browser could be driven: the session exposed no built-in browser or Claude-in-Chrome tools (ToolSearch found none), and the repo has no Playwright/Puppeteer (adding a package needs a ticket that says so). No UI flow was walked, so nothing was verified and no bugs were found or ruled out. Status stays needs-triage. To finish, run this from a session with a browser tool (Claude desktop built-in browser or Claude in Chrome) and walk the checklist; restart the API between runs because of the register rate limit.

- Driven 2026-10-21 by an agent with the Chrome DevTools MCP browser (dev API + Vite SPA + Docker Postgres, local `.env` with a freshly generated Ed25519 key pair; three Users in three isolated browser contexts: Alice (Nickname "Ali"), Bob, Carol). All flows in the checklist were walked through the UI. No code was changed.
  - Register/login: invalid signup shows field-level messages (username, password); valid signup shows "Account created"; login by username (different case), by email (different case) works; a wrong login shows the single generic error "Invalid username, email or password."
  - Direct message: search finds users by prefix, exact match ranked first; first send creates the Direct Conversation; it appears live in the other User's list; reply works; `<b>hello</b> & more` renders as literal text.
  - Create Group: group created with Bob; appears live for Bob; creator is shown as Owner.
  - Add/remove Member: Owner added Carol from the details panel ("carol was added" System Message, live to Bob and Carol); non-Owner (Bob) sees no add/remove controls; Owner removed Carol through the confirmation dialog ("carol was removed").
  - Former Member view: Carol sees the no-longer-a-member notice, no composer, and only Messages from her membership period (not the Message sent after removal, and not in her list preview).
  - Leave: Alice (Owner) left through the confirmation; she became a Former Member (read-only notice); ownership passed to Bob (Owner badge and add controls appeared).
  - Closed Group: Bob left as the last Member; the Group flipped to the closed notice live for Alice, Carol and Bob.
  - Logout: "Log out" returns to /login, a reload stays on /login.
  - Console/network: no uncaught errors. Only the expected 401 on the first `/auth/refresh` when not signed in, a "Blocked aria-hidden on an element because its descendant retained focus" warning after leaving a Group, and a "form field should have an id or name" issue. Every API call returned 2xx otherwise.
  - Bugs found (not fixed, each needs its own ticket):
    1. Serious: the message list's scroll spacer (`data-message-scroller-spacer`, from `@shadcn/react/message-scroller`, used via `packages/web/src/components/ui/message-scroller.tsx`) grows without bound after a live Message arrives or is sent in an open Conversation (roughly 20-30k px per second, reaching over 1M px in under a minute). The Messages pane then renders blank and the page becomes unusable (composer pushed off screen, interactions time out) until reload. Reproduced on all three Users' pages. It was not present right after opening a Conversation. Not checked whether it is specific to this headless Chrome, so confirm in a normal browser before fixing.
    2. Minor: on a non-acting Member's page, the Group header member count ("2 members") did not update when a Member was added or someone left live (it stayed at 2 when Carol was added, and at 2 after Alice left, where it should be 1); the details panel showed the correct count. The acting Owner's own header was correct.
    3. Minor: no visible System Message or notice for the Owner change (Bob became Owner when Alice left); the log only showed "Ali left" (spec story 41 asks that Members are notified). Not verified whether this is by design.
    4. Cosmetic: after a successful signup the "Account created" screen has no link or redirect to login.
    5. Cosmetic/a11y: the aria-hidden console warning above.
  - Not covered: profile edit, theme toggle, mobile layout, offline/reconnect banner, session revoked elsewhere, rate limit behaviour, 4000-char limit, retry of a failed send.
