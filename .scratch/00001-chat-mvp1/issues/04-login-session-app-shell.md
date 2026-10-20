# 04: Login, session and app shell

**What to build:** A User signs in with their Username or email and password and lands in the app shell: a sidebar (empty Conversation list for now) with a User menu and a theme switch. Reloading the page keeps them signed in, and the session refreshes silently while they use the app.

**Blocked by:** 03

**Status:** resolved

- [x] Login accepts Username or email, matched case-insensitively, plus password
- [x] Any failure returns one generic `INVALID_CREDENTIALS`, with comparable hashing work whether or not the User exists
- [x] Access token: EdDSA (Ed25519, key pair from config) via `@nestjs/jwt`, ~15 min, claims `sub`, `sid`, `jti`, `iat`, `exp`
- [x] Refresh token: opaque random value in an `httpOnly`, `Secure`, `SameSite=Strict` cookie, stored hashed in a sessions table, rotated on every refresh
- [x] Authenticated requests without a valid access token return `401 UNAUTHENTICATED`; expiry tested with the injectable clock
- [x] Get current User profile (Username, email, Nickname) endpoint
- [x] Login rate limits: 10 / 15 min / IP and 5 / 15 min / identifier
- [x] Captured logs from a login contain neither the password nor any token
- [x] SPA: login page (shadcn login block, no forgot-password or social links); access token held only in memory; refresh on load and before expiry; signed-out users are redirected to login
- [x] SPA app shell: shadcn `Sidebar` with an `Empty` Conversation list, a footer User menu showing the User's Nickname or Username, light/dark theme switch; on mobile the sidebar is a slide-over sheet
- [x] SPA tests: sign in and land in the shell; reload stays signed in; wrong password shows the generic error

## Comments

**Implementation notes (spec drift, PR #10):**
- Access tokens are signed with `jose`, not `@nestjs/jwt` (which cannot do EdDSA). Algorithm, claims and lifetime are as specified.
- API now requires `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (Ed25519 PEM) to boot; documented in `.env.example` and README.
- The health page moved to `/health`; `/` is the app shell.
- Profile endpoint is `GET /users/me`.
