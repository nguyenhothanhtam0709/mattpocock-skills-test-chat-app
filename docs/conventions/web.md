---
kind: intent
---

# Web conventions

Rules for `packages/web`. [General conventions](general.md) also apply. Paths below are relative to `packages/web/src/` unless they start with `packages/`.

## Files and imports

- Relative imports only reach the same folder or a folder below it, never `../`. Everything else uses the `@/` alias. Example: [AppShell.tsx](../../packages/web/src/shell/AppShell.tsx).
- Hand-written component files are PascalCase, and other modules are kebab-case. Examples: [ConversationList.tsx](../../packages/web/src/shell/ConversationList.tsx), [conversation-target.ts](../../packages/web/src/shell/conversation-target.ts).
- Never rename a file the shadcn CLI generated. That covers `components/ui/*` and the blocks in `components/`. They keep their kebab-case names. Example: [login-form.tsx](../../packages/web/src/components/login-form.tsx).

## Components

- Hand-written UI lives in its feature folder (`auth/`, `shell/`, `health/`), next to what uses it. Route pages are thin. Shadcn blocks stay in `components/`, and the feature's page wraps them. Example: [LoginPage.tsx](../../packages/web/src/auth/LoginPage.tsx) wraps [login-form.tsx](../../packages/web/src/components/login-form.tsx).
- Build UI from `@/components/ui/*` (shadcn, style `base-nova`, lucide icons). Add components only with the shadcn CLI and never hand-edit the generated files (lint ignores them). The CLI also adds the `cn` npm package, so a Ticket that adds a component needs it in Allowed packages. See [components.json](../../packages/web/components.json). Example: [NewConversationDialog.tsx](../../packages/web/src/shell/NewConversationDialog.tsx).
- Style only with Tailwind classes in `className`. No `style={{}}` outside ui components. Only ui components use `cn()`. See [utils.ts](../../packages/web/src/lib/utils.ts).
- Before sending a form, `safeParse` its input with the contracts schema. Example: [ProfileDialog.tsx](../../packages/web/src/shell/ProfileDialog.tsx).

## Data fetching

- Put one function per endpoint in `api/<resource>.ts`, using plain `fetch`. Parse success bodies with the contracts schema, map `ErrorCode` to user-facing text, and return an `{ ok, ... }` union. Never throw to components. Example: [users.ts](../../packages/web/src/api/users.ts).
- Components make authenticated calls only through `useAuth()`, which adds the access token. Calls to public endpoints (health, register) may import `@/api/*` directly. See [AuthProvider.tsx](../../packages/web/src/auth/AuthProvider.tsx).
- Async effects use an `AbortController`, check `signal.aborted` before setting state, and abort on cleanup. Example: [ConversationList.tsx](../../packages/web/src/shell/ConversationList.tsx).

## State and hooks

- State is local `useState` plus context providers (Auth, Realtime, Theme). Use no query or state library. Only `ThemeProvider` uses `localStorage`. Examples: [RealtimeProvider.tsx](../../packages/web/src/realtime/RealtimeProvider.tsx), [ThemeProvider.tsx](../../packages/web/src/theme/ThemeProvider.tsx).
- A custom hook lives in its provider's file (`useAuth`, `useTheme`, `useRealtimeEvents`). `hooks/` holds only shadcn's `use-mobile.ts`. Example: [RealtimeProvider.tsx](../../packages/web/src/realtime/RealtimeProvider.tsx).

## Routing and realtime

- Routing is react-router's `BrowserRouter` in `App.tsx`, with guards as layout routes (`RequireSignedIn`, `SignedOutOnly`). The open Conversation is shell state, not a URL (see "Conversation URLs" in [laters](../laters.md)). See [App.tsx](../../packages/web/src/App.tsx).
- Components get pushed events only through the `RealtimeProvider` hooks: `useRealtimeEvents`, `useConnectionStatus` and `useReconnected`. Events are parsed with the contracts event schemas. Examples: [RealtimeProvider.tsx](../../packages/web/src/realtime/RealtimeProvider.tsx), [socket-realtime.ts](../../packages/web/src/realtime/socket-realtime.ts).

## Tests

Tests render `<App />` with Testing Library and stub the network with MSW (`server.use`). Default handlers are in [server.ts](../../packages/web/src/test/server.ts), setup in [setup.ts](../../packages/web/src/test/setup.ts), and pushed events come from [fake-realtime.ts](../../packages/web/src/test/fake-realtime.ts). Example: [routing.test.tsx](../../packages/web/src/routing.test.tsx).
