# Laters

Decisions to revisit after MVP1. These are intentions, not commitments; turn each into a spec/ADR before starting.

## Conversation URLs

A URL per Conversation, so reload, Back and deep links work. Today the open Conversation lives in app shell state. Awkward for a new Direct Conversation, which has no id until the first Message is sent.

## Contract-first development

Today `packages/contracts` (Zod) is shared by the API and SPA, but endpoints are built code-first and there are no generated API docs (OpenAPI is out of scope for MVP1). In a later MVP, move to contract-first: define the HTTP contract (request, response and error shapes) before the implementation, and drive the API and SPA from it. Decide the contract format (extending the Zod contracts vs. OpenAPI) in an ADR when this is picked up.

## Scale out the API

The API runs as a single instance (ADR [0006](adr/0006-api-runs-as-a-single-instance.md)): commit ordering uses an in-process serializer and Socket.IO rooms are in memory. To run more than one instance, add the Socket.IO Redis adapter and move ordering to the database. Turn that into a spec before starting.
