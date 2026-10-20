# 21: Use shadcn `Command` for the Member pickers

**What to build:** Replace the Username-search combobox in the New Group dialog and the Group details Add Member picker with shadcn `Command` inside `Dialog`/`Popover`, as the spec and tickets 15–16 asked.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Add `cmdk` to `packages/web` (approved by the user for this ticket; no other package changes)
- [ ] Add the shadcn `command` component the project's usual way
- [ ] New Group dialog and Add Member picker use `Command` with the existing user-search endpoint
- [ ] Existing SPA tests for both flows pass or are updated; behaviour is unchanged

## Comments

- Package approval: the user approved adding `cmdk` (2026-10-21).
