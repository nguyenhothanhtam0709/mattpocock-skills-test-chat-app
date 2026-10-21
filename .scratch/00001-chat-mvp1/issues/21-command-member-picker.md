# 21: Use shadcn `Command` for the Member pickers

**What to build:** Replace the Username-search combobox in the New Group dialog and the Group details Add Member picker with shadcn `Command` inside `Dialog`/`Popover`, as the spec and tickets 15–16 asked.

**Blocked by:** none

**Status:** resolved

- [x] Add `cmdk` to `packages/web` (approved by the user for this ticket; no other package changes)
- [x] Add the shadcn `command` component the project's usual way
- [x] New Group dialog and Add Member picker use `Command` with the existing user-search endpoint
- [x] Existing SPA tests for both flows pass or are updated; behaviour is unchanged

## Comments

- Package approval: the user approved adding `cmdk` (2026-10-21).
- Implementation: the shared `UserSearchCombobox` now renders shadcn `Command` (cmdk with `shouldFilter={false}`; server does the matching), so the New Conversation dialog uses it too. Test setup gained jsdom stubs for `ResizeObserver`/`scrollIntoView` (no package change). The shadcn CLI also added a bogus `cn` dependency and `from "cn"` import; both were removed in favour of `@/lib/utils`.
