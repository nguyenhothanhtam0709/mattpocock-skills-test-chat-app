# 05: Logout, token deny-list and refresh-token reuse detection

**What to build:** A User chooses Log out from the User menu and that session ends immediately: its access token stops working at once, its refresh token is dead, and the SPA returns to the login page. If an already-used refresh token is ever replayed, the whole session is revoked.

**Blocked by:** 04

**Status:** resolved

- [x] `TokenDenyList` port (add with expiry, check, sweep expired) with a Postgres adapter
- [x] One shared contract test suite for the port, run against the Postgres adapter (and reusable for future adapters)
- [x] Logout adds the access token's `jti` to the deny-list until its expiry and revokes the session
- [x] A denied access token returns `401` (`SESSION_REVOKED`) on any authenticated request
- [x] Presenting a rotated (already-used) refresh token revokes the session; subsequent refreshes fail
- [x] Expired deny-list entries are swept (tested with the injectable clock)
- [x] SPA: Log out in the User menu clears auth state and returns to login; tested

## Comments

**Implementation notes (spec drift, PR #11):**
- Added `token_deny_list` table and `sessions.previous_refresh_token_hash` (migration 0004).
- `AuthGuard` also rejects tokens whose session row is gone (`SESSION_REVOKED`), at the cost of two extra DB lookups per authenticated request. Ticket 14 (socket revocation) must reuse this check.
- Reuse detection remembers one rotation back only; older tokens get a plain 401 without revoking the session.
- Sweeping runs on logout; there is no timer.
- Reuse-detection tests were written after the code, not seen failing first.
