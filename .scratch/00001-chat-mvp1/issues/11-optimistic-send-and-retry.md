# 11: Optimistic send and retry

**What to build:** When a User sends a Message it appears immediately in a pending state. If sending fails it is marked as failed with a Retry action; retrying never creates a duplicate.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] SPA generates a client message ID per composed Message
- [ ] Pending Messages render with the `muted` Bubble variant and are replaced by the confirmed Message on success
- [ ] Failed Messages render with the `destructive` Bubble variant and a Retry `Button` in the Message footer
- [ ] Retry reuses the same client message ID; if the server had in fact stored it, the `200` response is reconciled without a duplicate
- [ ] `429 RATE_LIMITED` and validation errors are surfaced to the User
- [ ] SPA tests via MSW cover success, failure → retry → success, and the duplicate-response case
