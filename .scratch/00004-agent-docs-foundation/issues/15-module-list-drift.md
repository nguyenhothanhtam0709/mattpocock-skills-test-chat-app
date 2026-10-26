# 15: One feature-module list for AppModule and the routes doc

**What to build:** `packages/api/src/docs/generate-docs.ts` hard-codes `[HealthModule, AuthApiModule, MessagesModule, GroupsModule]`, a copy of the feature modules imported in `app.module.ts`. A new feature module added only to `AppModule` silently drops out of `docs/architecture/http-routes.md`, and the regenerate-no-diff check can't catch it. Keep the list in one place that both use (api package). Found in the spec's final code review.

**Allowed packages:** None

**Blocked by:** None

**Status:** resolved

- [x] The feature-module list exists once; `AppModule` and `generate-docs.ts` both use it
- [x] `pnpm docs:generate` produces no diff in `docs/architecture/`
- [x] `pnpm lint`, `pnpm typecheck` and `pnpm test` pass

**Verification:** run `pnpm docs:generate` and confirm `git status` shows no change under `docs/architecture/`.

**Out of scope:** The duplicated throttler route strings (their own Laters entry). Any behaviour change in the API.

## Comments

- Resolved: `FEATURE_MODULES` in `packages/api/src/feature-modules.ts` is spread into `AppModule` imports and passed to `renderRoutes` in `generate-docs.ts`; a pure refactor, so no new test (testing policy), and the regenerated docs are unchanged.
