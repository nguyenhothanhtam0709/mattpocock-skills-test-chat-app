# Web package

The React single-page app, built with Vite, React Router and shadcn/ui. It calls the API over HTTP and listens for pushed realtime events. How it fits with api and contracts: [architecture overview](../../docs/architecture/overview.md).

## Commands

Run from the repo root. Setup and what each test run needs: [setup](../../docs/workflow/setup.md).

- `pnpm dev:web`: Vite on port 5173. It proxies `/api` and `/socket.io` to the API on port 3000, so start `pnpm dev:api` for real data.
- `pnpm build:contracts`, then `pnpm --filter @chat/web test`: needs nothing else. MSW fakes the network.

## Rules

- [Web conventions](../../docs/conventions/web.md) and [general conventions](../../docs/conventions/general.md).
- Which tests a change needs, including browser checks: [testing policy](../../docs/workflow/testing-policy.md).
- ADRs: [0001 server-push-only WebSocket](../../docs/adr/0001-websocket-is-server-push-only.md), [0002 validate input, encode output](../../docs/adr/0002-validate-input-encode-output-no-sanitizer.md).

## Never

- Never hand-edit the generated shadcn/ui files in `src/components/ui/`. Add or change components through the shadcn skill and CLI ([web conventions](../../docs/conventions/web.md#components)).

## Reference files

- Routes and guards: [App.tsx](src/App.tsx). shadcn config: [components.json](components.json).
- Test setup: [server.ts](src/test/server.ts) and [fake-realtime.ts](src/test/fake-realtime.ts). Example test: [routing.test.tsx](src/routing.test.tsx).
- What the API offers: [HTTP routes](../../docs/architecture/http-routes.md) and [realtime events](../../docs/architecture/realtime-events.md).
