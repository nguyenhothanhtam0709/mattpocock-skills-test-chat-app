# 03: Messages and groups modules

**What to build:** Messages and groups each have their own module, and `AppModule` ends up as a thin shell that only imports modules. The messages module (controller, service, commit order, conversation queries) imports realtime. The groups module (controller, service) imports realtime, messages and memberships. Sending and reading messages, group management, system messages and pushes all work as before.

**Blocked by:** 02

**Status:** ready-for-agent

- [x] The messages and groups modules own their controllers and providers, with the imports described above
- [x] `AppModule` lists no controllers or providers of its own, only modules
- [x] The whole module graph has no cycles and no `forwardRef`
- [x] All existing tests pass without edits
- [x] No new package or dependency

## Comments
