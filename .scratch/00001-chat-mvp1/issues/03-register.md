# 03: Register

**What to build:** A visitor opens the signup page, enters a Username, email, password and optional Nickname, and becomes a User. Invalid input is explained field by field; a Username or email already in use (in any capitalization) is rejected.

**Blocked by:** 02

**Status:** ready-for-agent

- [ ] Contracts schemas for Username (3–32, letters/digits/underscore), email, password (8–128), Nickname (optional, 1–50 after trim), with exhaustive contracts tests including NFC normalization and rejection of control and bidi-override characters
- [ ] Username and email stored exactly as typed; uniqueness enforced case-insensitively by DB constraints; `USERNAME_TAKEN` / `EMAIL_TAKEN` returned (e.g. `alice` after `Alice`)
- [ ] Password hashed with argon2id; never returned
- [ ] One API test per invalid-input wiring case returns `VALIDATION_FAILED` with `details`
- [ ] Register rate limit 5 / hour / IP
- [ ] Captured logs from a registration contain neither the password nor the email
- [ ] Signup page built from the shadcn signup block (no social or extra links), `Field` with `data-invalid` / `aria-invalid` for errors from the shared schema and from the API
- [ ] SPA test: a visitor registers successfully and sees the result; a taken Username shows an error on the Username field
