---
kind: descriptive
---

# Chat

A chat app where Users exchange Messages in Direct Conversations and Groups, with realtime delivery. A pnpm workspace with three packages:

- `packages/api`: NestJS on Fastify, Drizzle and Postgres, Socket.IO for realtime push.
- `packages/web`: the SPA, React, Vite and shadcn/ui.
- `packages/contracts`: Zod schemas shared by the API and the SPA.

How they fit together: [architecture overview](docs/architecture/overview.md). Domain terms: [GLOSSARY-MAP.md](GLOSSARY-MAP.md).

Agents start from [AGENTS.md](AGENTS.md), not from this file.

## Quick start

Needs Node 24, pnpm and Docker. Follow [setup](docs/workflow/setup.md) once (install, `.env` with a JWT key pair, database up, migrate, optional seed), then:

```sh
pnpm dev:api   # API on http://localhost:3000/api/v1
pnpm dev:web   # SPA on http://localhost:5173, proxies /api to the API
```

Repeated logins during local work can hit `429 RATE_LIMITED`: set `THROTTLE_DISABLED=true` in `packages/api/.env` and restart the API ([.env.example](packages/api/.env.example)). Never set it in a deployment.

## Docs

- [docs/architecture/](docs/architecture/): how the app works today, plus Generated Docs (ER diagram, HTTP routes, realtime events, package graph, ADR index) from `pnpm docs:generate`.
- [docs/conventions/](docs/conventions/): coding conventions, general and per package.
- [docs/workflow/](docs/workflow/): per-Ticket rules: setup, git workflow, definition of done, ticket template, testing policy, escalation.
- [docs/factory/](docs/factory/): the agent pipeline from idea to merge, and the Factory glossary.
- [docs/adr/](docs/adr/): architecture decision records, one numbering for the whole repo.
- [docs/agents/](docs/agents/): config for the mattpocock skills. Ask the human before changing it.
- [docs/laters.md](docs/laters.md): notes for a later MVP.

Every doc declares its kind (Intent, Generated or Descriptive) in front matter, which decides who maintains it and whether it or the code wins a conflict. Which docs are exempt: [ADR 0008](docs/adr/0008-documents-are-classed-by-how-they-are-maintained.md).

Specs and Tickets live in [.scratch/](.scratch/): one `NNNNN-<feature>/` folder per spec, with `spec.md` and its Tickets under `issues/`.
