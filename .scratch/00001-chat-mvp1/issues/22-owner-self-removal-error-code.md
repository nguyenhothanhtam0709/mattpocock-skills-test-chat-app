# 22: Dedicated error code when the Owner removes themselves

**What to build:** Removing the Owner via the remove-Member endpoint currently answers `400 VALIDATION_FAILED`. Give it a dedicated domain error code, as the spec requires for domain invariants.

**Blocked by:** none

**Status:** ready-for-agent

- [ ] New error code `OWNER_CANNOT_BE_REMOVED` in contracts (status `409`, matching the other domain-rule codes); the Owner removing themselves returns it
- [ ] API test updated; SPA shows no removal action for the Owner (unchanged) and handles the code if it ever arrives
- [ ] Ticket 16 comment updated

## Comments

- The user asked for "a dedicated error"; the name and status are a guess by the agent that wrote this ticket.
