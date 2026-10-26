---
kind: intent
---

# Testing policy

Which tests a change needs. How to run them is in [setup](setup.md). Where test files go is in [general conventions](../conventions/general.md#tests).

## Kinds of test

- **API behaviour test**: drives the real app over HTTP or socket with the app harness against real Postgres. Example: [groups.test.ts](../../packages/api/src/groups/groups.test.ts), harness in [app-harness.ts](../../packages/api/test/app-harness.ts).
- **Web behaviour test**: renders `<App />`, acts as a user with Testing Library and fakes only the network. Example: [login.test.tsx](../../packages/web/src/login.test.tsx).
- **Contracts test**: schemas and shared helpers in contracts. Example: [group.test.ts](../../packages/contracts/src/group.test.ts).
- **Script test**: `node --test` tests for `scripts/`. Example: [scripts/docs/](../../scripts/docs/).
- **Unit test**: one function, class or hook on its own, with its collaborators replaced by test doubles. An extra, never a replacement for a behaviour test.
- **Browser check**: a manual run of the real app in a browser (Chrome DevTools MCP). Not automated.

## Which test a change needs

- Every change in behaviour gets at least one test at the outermost layer where a user or client can see it: an API change gets an API behaviour test, a UI change gets a web behaviour test.
- A contract change gets a contracts test, plus the API and web behaviour tests for what it changes.
- Add a unit test only for logic that is hard or slow to reach through a behaviour test: many branches, error paths such as a database or network failure, retries, timing, edge cases a behaviour test can't set up.
- A change a user can see (layout, styling, a new screen or flow) also needs a browser check. Record what you checked in the PR's verification section.
- A change to docs, comments, config or formatting alone needs no automated test; review checks it (links resolve, front matter present).
- A refactor needs no new test, as long as the existing tests stay green and none is weakened.
- There is no coverage target. Write the right test, not a percentage.

## Test first

- A bug fix starts with a failing test that reproduces the bug.
- New behaviour is built test-first with the `tdd` skill.

## Mocking

- Behaviour tests never mock our own code (`vi.mock`, `vi.spyOn`). API tests use real Postgres, never a mocked database. Web tests fake only the network: MSW ([server.ts](../../packages/web/src/test/server.ts)) and the fake realtime ([fake-realtime.ts](../../packages/web/src/test/fake-realtime.ts)). Control time with the test clock ([test-clock.ts](../../packages/api/test/test-clock.ts)), never with real sleeps.
- An exception in a behaviour test needs the human's approval. Record it as a one-line comment beside the mock saying why no seam exists and who approved it.
- Unit tests may mock the unit's collaborators, including our own services, repositories and the database client, without approval. Pass test doubles (`vi.fn()`) through the unit's existing seam: Nest's `Test.createTestingModule(...).overrideProvider(...)`, constructor or function parameters, or props. Use `vi.mock` only where no such seam exists, with a comment saying why.

## Changing existing tests

- Deleting, skipping (`.skip`, `.only`, `.todo`) or loosening an assertion in an existing test needs the human's approval, unless the Ticket removes the behaviour the test covers.
- A flaky test (passes and fails on reruns with no change) is never retried until green or skipped. [Escalate](escalation.md), unless the Ticket is about fixing that flake.
