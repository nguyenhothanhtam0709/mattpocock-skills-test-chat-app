# 05: Logout, token deny-list and refresh-token reuse detection

**What to build:** A User chooses Log out from the User menu and that session ends immediately: its access token stops working at once, its refresh token is dead, and the SPA returns to the login page. If an already-used refresh token is ever replayed, the whole session is revoked.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] `TokenDenyList` port (add with expiry, check, sweep expired) with a Postgres adapter
- [ ] One shared contract test suite for the port, run against the Postgres adapter (and reusable for future adapters)
- [ ] Logout adds the access token's `jti` to the deny-list until its expiry and revokes the session
- [ ] A denied access token returns `401` (`SESSION_REVOKED`) on any authenticated request
- [ ] Presenting a rotated (already-used) refresh token revokes the session; subsequent refreshes fail
- [ ] Expired deny-list entries are swept (tested with the injectable clock)
- [ ] SPA: Log out in the User menu clears auth state and returns to login; tested
