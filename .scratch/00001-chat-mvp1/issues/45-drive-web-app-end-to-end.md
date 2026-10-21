# 45: Drive the web app end to end in a browser

**What to build:** Ticket 39's end-to-end check ran a script against the real API, Postgres and Socket.IO but did not drive the browser UI.

**Blocked by:** none

**Status:** needs-triage

- [ ] Launch the app (the `run` skill) and walk the main flows through the UI: register/login, Direct message, create Group, add/remove Member, leave, Former Member view, Closed Group, logout
- [ ] Report or fix what breaks (ask before behaviour changes)

## Comments

- From the final code review of tickets 38-40 (spec axis). Note the API register rate limit (5 per hour per IP) when repeating runs.
