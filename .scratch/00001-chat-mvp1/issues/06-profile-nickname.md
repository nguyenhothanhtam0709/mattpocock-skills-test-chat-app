# 06: Profile Nickname

**What to build:** A User opens Profile from the User menu, sees their Username and email, and can set, change or clear their Nickname. The sidebar's User menu reflects the change.

**Blocked by:** 04

**Status:** resolved

- [x] Update Nickname endpoint: set (1–50 chars after trim, contracts rules) or clear
- [x] Username cannot be changed through any endpoint
- [x] Invalid Nickname returns `VALIDATION_FAILED`
- [x] SPA: Profile `Dialog` with a `Field` for Nickname and inline errors; save updates the User menu; tested

## Comments

**Implementation notes (spec drift, PR #12):**
- `PATCH /api/v1/users/me` takes `{ nickname: string | null }` (strict object; extra fields are `VALIDATION_FAILED`). No schema change.
- The API rejects whitespace-only Nicknames; the SPA treats an empty or whitespace-only field as clear (sends `null`).
