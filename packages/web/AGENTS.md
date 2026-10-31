---
kind: intent
---

# Web package

The React single-page app, built with Vite, React Router and shadcn/ui. It calls the API over HTTP and listens for pushed realtime events. Only when a change crosses packages: [architecture overview](../../docs/architecture/overview.md).

## Commands

Run from the repo root. Only when the environment isn't ready: [setup](../../docs/workflow/setup.md).

- `pnpm dev:web`: Vite on port 5173. It proxies `/api` and `/socket.io` to the API on port 3000, so start `pnpm dev:api` for real data.
- `pnpm build:contracts`, then `pnpm --filter @chat/web test`: needs nothing else. MSW fakes the network.

## Rules

- When writing code here: [web conventions](../../docs/conventions/web.md) and [general conventions](../../docs/conventions/general.md).
- When writing tests: [testing policy](../../docs/workflow/testing-policy.md). When the Ticket needs a browser check: [browser check](../../docs/workflow/browser-check.md).
- ADRs, only when the change touches their subject:
  - Realtime: [0001 server-push-only WebSocket](../../docs/adr/0001-websocket-is-server-push-only.md).
  - Rendering user text: [0002 validate input, encode output](../../docs/adr/0002-validate-input-encode-output-no-sanitizer.md).

## Never

- Never hand-edit the generated shadcn/ui files in `src/components/ui/`. Add or change components through the shadcn skill and CLI ([web conventions](../../docs/conventions/web.md#components)).

## Reference files

Open these when you need the pattern:

- Routes and guards: [App.tsx](src/App.tsx). shadcn config: [components.json](components.json).
- Writing tests: [server.ts](src/test/server.ts) and [fake-realtime.ts](src/test/fake-realtime.ts). Example: [routing.test.tsx](src/routing.test.tsx).
- Looking up what the API offers without reading code: [HTTP routes](../../docs/architecture/http-routes.md) and [realtime events](../../docs/architecture/realtime-events.md).
