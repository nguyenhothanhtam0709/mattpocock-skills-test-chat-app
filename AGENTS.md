## Agent skills

### Issue tracker

Issues and specs are local markdown files under `.scratch/NNNNN-<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Git workflow

Never push directly to `main`; every commit goes through a PR. See `docs/workflow/git-workflow.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Database

The Drizzle schema is the source of truth; generate migrations with `pnpm db:generate`, never hand-edit them. See `docs/adr/0003-drizzle-schema-is-source-of-truth.md`.

Generated IDs and "created at" timestamps are DB column defaults, not passed from app code. See `docs/adr/0004-db-generates-ids-and-created-timestamps.md`.

Avoid nullable columns and prefer DB-generated values (defaults, built-ins like `now()`) for data consistency. See `docs/adr/0005-avoid-nullable-columns-prefer-db-generated-values.md`.

### No assumptions

Don't assume; ask. Never add, remove or change a package without the ticket saying so. See `docs/workflow/no-assumptions.md`.
