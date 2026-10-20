# 07: User search

**What to build:** A User opens a "New conversation" dialog, types the start of someone's Username, and sees matching Users (Username and Nickname) to pick from.

**Blocked by:** 04

**Status:** resolved

- [x] Search query `q` 2–32 chars (contracts); prefix match on Username only, case-insensitive
- [x] `%` and `_` in the query are escaped and treated literally (`a_b` does not match `axb`)
- [x] Exact Username match ranked first; at most 20 results; the searching User is excluded
- [x] Results contain ID, Username and Nickname only, never email (asserted against the response schema)
- [x] Search rate limit 30 / min / User
- [x] SPA: `Command` inside `Dialog` with server-side results (no client-side filtering), empty and loading states; tested with MSW

## Comments

**Implementation notes (assumptions, PR for ticket 07):**
- `Command` (shadcn) needs the `cmdk` package, which the ticket does not authorise adding. The picker is a `Dialog` with an `Input` (combobox) and a listbox (arrow keys, Enter, click) built from existing dependencies. Swapping in `Command` later is a drop-in once `cmdk` is approved.
- Picking a User currently just closes the dialog; starting the Direct Conversation belongs to the next ticket.
- The 30/min/User limit is a named `search` throttler counted by a route-level guard after `AuthGuard` (the global guard runs before authentication and only knows the IP).
- `q` is not trimmed or rewritten beyond NFC; control characters are rejected.
