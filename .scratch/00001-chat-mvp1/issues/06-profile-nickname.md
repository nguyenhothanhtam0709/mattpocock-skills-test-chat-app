# 06: Profile Nickname

**What to build:** A User opens Profile from the User menu, sees their Username and email, and can set, change or clear their Nickname. The sidebar's User menu reflects the change.

**Blocked by:** 04

**Status:** ready-for-agent

- [ ] Update Nickname endpoint: set (1–50 chars after trim, contracts rules) or clear
- [ ] Username cannot be changed through any endpoint
- [ ] Invalid Nickname returns `VALIDATION_FAILED`
- [ ] SPA: Profile `Dialog` with a `Field` for Nickname and inline errors; save updates the User menu; tested
