# 04: Share read receipts setting

**What to build:** Let a User choose whether to share read receipts (spec 00006, "Domain rules", "Schema" and "HTTP API"). Touches the api, contracts and web packages.

- `users` gains a non-null boolean "share read receipts" column with a default of true (ADR 0005).
- The current-User profile response includes `shareReadReceipts`, and `PATCH /api/v1/users/me` accepts it, alone or together with the Nickname.
- Changing it pushes nothing.
- The Profile dialog gains a "Share read receipts" switch.

**Allowed packages:** None

**Blocked by:** None (can start immediately)

**Status:** needs-info

- [x] A newly registered User and every existing User has `shareReadReceipts: true`
- [x] `PATCH /users/me` with `shareReadReceipts` changes it and returns the updated profile. Updating only the Nickname leaves it unchanged.
- [x] A non-boolean value gets `400 VALIDATION_FAILED`
- [ ] The Profile dialog shows the switch with the current value and saves a change
- [x] The contract change has a contracts test

**Verification:**
- API and web behaviour tests for the criteria above.
- A browser check of the Profile dialog.

**Out of scope:** What the setting controls: `readUpToSequence` and `conversation.receipt` (ticket 05). Pushing the change in real time.

## Comments

### Blocked: adding the shadcn Switch adds an npm package (agent, 2026-10-29)

**Done on `agent/00006-04-share-read-receipts-setting`:** the `users.share_read_receipts` column (non-null, default `true`; migration `0015` generated with `pnpm db:generate`, so existing Users get `true` from the default), `shareReadReceipts` on the current-User profile (`UserSchema`, so register, login and `GET`/`PATCH /users/me` all carry it), and `PATCH /users/me` accepting it alone or with the Nickname. Contracts and API behaviour tests pass. The web User fixtures gained `shareReadReceipts: true`. The web tests for the Profile switch are written and red.

**What I tried:** `pnpm exec shadcn add switch` in `packages/web`. The upstream registry (shadcn 4.22.1, style `base-nova`) now lists the npm package `cn` as a dependency of every component, and its files import `cn` from `"cn"` rather than `@/lib/utils`. The CLI added `cn@^0.5.0` to `packages/web/package.json` and the lockfile. `shadcn add label --diff` shows the same change for a component we already have, so this is a registry change, not something about Switch. I reverted it: the ticket's Allowed packages are "None".

**Question:** how should the Profile dialog get a switch?

1. **Allow `cn` as a web dependency** for this ticket and keep the CLI output as generated. It follows the "add only with the CLI, never hand-edit" rule, but adds a package that duplicates `@/lib/utils` and leaves one ui file importing a different `cn` from the rest.
2. **Allow a one-line fix to the generated `switch.tsx`** (import `cn` from `@/lib/utils`) and revert the dependency. No new package, consistent with the other ui files, but it is a hand-edit of a generated file, which the web conventions forbid without an exception.
3. **Use Base UI's `Switch` directly** (`@base-ui/react/switch`, already a dependency) in `ProfileDialog`, styled with Tailwind. No new package and no generated file, but it breaks "build UI from `@/components/ui/*`".

Recommendation: option 2. It needs no new package and matches the other 25 ui files. The registry change probably also deserves a line in the web conventions or `docs/laters.md`, because it affects every future `shadcn add`.

**Blocked:** the fourth acceptance criterion (the Profile dialog switch) and the browser check.

