# Laters

Decisions to revisit after MVP1. These are intentions, not commitments; turn each into a spec/ADR before starting.

## Client-side router

The SPA has no router. After ticket 03, `App` picks the signup page when the path is `/signup` and the health page otherwise, as a stopgap. Add a real router when ticket 04 (login, session, app shell) lands, and delete the path check.

## Migrate to `@nestjs/drizzle`

The API wires Drizzle in by hand (`packages/api/src/db/database.module.ts`). In a later MVP, move to `@nestjs/drizzle`. At the time of writing it is at `0.0.x`, so check its maturity first. The migration must keep ADR 0003: the Drizzle schema stays the source of truth and migrations stay generated.

## Contract-first development

Today `packages/contracts` (Zod) is shared by the API and SPA, but endpoints are built code-first and there are no generated API docs (OpenAPI is out of scope for MVP1). In a later MVP, move to contract-first: define the HTTP contract (request, response and error shapes) before the implementation, and drive the API and SPA from it. Decide the contract format (extending the Zod contracts vs. OpenAPI) in an ADR when this is picked up.

## Scale out the API

The API runs as a single instance (ADR [0006](adr/0006-api-runs-as-a-single-instance.md)): commit ordering uses an in-process serializer and Socket.IO rooms are in memory. To run more than one instance, add the Socket.IO Redis adapter and move ordering to the database. Turn that into a spec before starting.
