# 03: Register

**What to build:** A visitor opens the signup page, enters a Username, email, password and optional Nickname, and becomes a User. Invalid input is explained field by field; a Username or email already in use (in any capitalization) is rejected.

**Blocked by:** 02

**Status:** resolved

- [x] Contracts schemas for Username (3–32, letters/digits/underscore), email, password (8–128), Nickname (optional, 1–50 after trim), with exhaustive contracts tests including NFC normalization and rejection of control and bidi-override characters
- [x] Username and email stored exactly as typed; uniqueness enforced case-insensitively by DB constraints; `USERNAME_TAKEN` / `EMAIL_TAKEN` returned (e.g. `alice` after `Alice`)
- [x] Password hashed with argon2id; never returned
- [x] One API test per invalid-input wiring case returns `VALIDATION_FAILED` with `details`
- [x] Register rate limit 5 / hour / IP
- [x] Captured logs from a registration contain neither the password nor the email
- [x] Signup page built from the shadcn signup block (no social or extra links), `Field` with `data-invalid` / `aria-invalid` for errors from the shared schema and from the API
- [x] SPA test: a visitor registers successfully and sees the result; a taken Username shows an error on the Username field

## Answer

Implemented end to end. Contracts: `UsernameSchema` (ASCII letters/digits/underscore, 3-32), `EmailSchema`, `PasswordSchema` (8-128 characters), `NicknameSchema` (trimmed, 1-50), `RegisterRequestSchema`/`RegisterResponseSchema`, all NFC-normalizing and rejecting control and bidi-override characters. API: `POST /api/v1/auth/register` stores Username and email as typed, hashes the password with argon2id, relies on case-insensitive unique indexes on `lower(username)` / `lower(email)` (race-free) and answers `409 USERNAME_TAKEN` / `EMAIL_TAKEN`; rate limited to 5/hour/IP. The `users` table comes from the Drizzle schema with generated migrations (the `app_meta` placeholder was dropped the same way). SPA: signup page at `/signup` built from the shadcn signup block (no social or extra links), with `Field` `data-invalid` / `aria-invalid` errors from the shared schema and the API.
