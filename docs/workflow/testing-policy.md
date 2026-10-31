---
kind: intent
---

# Testing policy

Which tests a change needs, and how often to run them. Commands are in [setup](setup.md#tests), if the package's `AGENTS.md` doesn't have them.

## Kinds of test

- **API behaviour test**: drives the real app over HTTP or socket with the app harness (`packages/api/test/app-harness.ts`) against real Postgres.
- **Web behaviour test**: renders `<App />`, acts as a user with Testing Library and fakes only the network.
- **Migration test**: gives the test its own fresh database in the run's Postgres (`packages/api/test/migration-database.ts`), migrates it up to a named migration, seeds rows with plain SQL, applies the remaining migrations and checks the rows.
- **Contracts test**: schemas and shared helpers in contracts.
- **Script test**: `node --test` tests for `scripts/`.
- **Unit test**: one function, class or hook on its own, with its collaborators replaced by test doubles. An extra, never a replacement for a behaviour test.
- **Browser check**: a manual run of the real app in a browser (Chrome DevTools MCP). Not automated.

## Which test a change needs

- Every change in behaviour gets at least one test at the outermost layer where a user or client can see it: an API change gets an API behaviour test, a UI change gets a web behaviour test.
- A contract change gets a contracts test, plus the API and web behaviour tests for what it changes.
- A migration that rewrites or backfills existing rows gets a migration test.
- Add a unit test only for logic that is hard or slow to reach through a behaviour test: many branches, error paths such as a database or network failure, retries, timing, edge cases a behaviour test can't set up.
- A change a user can see (layout, styling, a new screen or flow) also needs a browser check. Record what you checked in the PR's verification section.
- A change to docs, comments, config or formatting alone needs no automated test; review checks it (links resolve, front matter present).
- A refactor needs no new test, as long as the existing tests stay green and none is weakened.
- There is no coverage target. Write the right test, not a percentage.

## How often

- While working, run the test file you changed, then its package. Don't run `pnpm test` yet.
- Before opening the PR, merge the Feature Branch tip in, then run the full checks in the [definition of done](definition-of-done.md) once.
- If a check fails, fix it and re-run only what failed. Then run the full checks once more.
- Cut test output with `| tail -n 40`, and look at it in full only on a failure. It stays in the context for the rest of the run.
- Browser checks: [browser check](browser-check.md).

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
