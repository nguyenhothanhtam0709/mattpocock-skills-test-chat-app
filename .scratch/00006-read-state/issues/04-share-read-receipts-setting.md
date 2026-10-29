# 04: Share read receipts setting

**What to build:** Let a User choose whether to share read receipts (spec 00006, "Domain rules", "Schema" and "HTTP API"). Touches the api, contracts and web packages.

- `users` gains a non-null boolean "share read receipts" column with a default of true (ADR 0005).
- The current-User profile response includes `shareReadReceipts`, and `PATCH /api/v1/users/me` accepts it, alone or together with the Nickname.
- Changing it pushes nothing.
- The Profile dialog gains a "Share read receipts" switch.

**Allowed packages:** None

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A newly registered User and every existing User has `shareReadReceipts: true`
- [ ] `PATCH /users/me` with `shareReadReceipts` changes it and returns the updated profile. Updating only the Nickname leaves it unchanged.
- [ ] A non-boolean value gets `400 VALIDATION_FAILED`
- [ ] The Profile dialog shows the switch with the current value and saves a change
- [ ] The contract change has a contracts test

**Verification:**
- API and web behaviour tests for the criteria above.
- A browser check of the Profile dialog.

**Out of scope:** What the setting controls: `readUpToSequence` and `conversation.receipt` (ticket 05). Pushing the change in real time.

## Comments
