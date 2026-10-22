# 07: Remove redundant imports from `AppModule`

**What to build:** `AppModule` imports `AuthModule`, `RealtimeModule` and `AuthApiModule`, but `AuthApiModule` already imports the first two. Keep only the imports `AppModule` needs and put them in a readable order, so the dependency direction is clear. No behaviour change.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `AppModule` lists no module that another listed module already brings in only for its own use (keep it if something outside that chain needs it)
- [x] App still boots, no `forwardRef`, no cycles
- [x] All existing tests pass without edits

## Comments
