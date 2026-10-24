## Agent skills

### Issue tracker

Issues and specs are local markdown files under `.scratch/NNNNN-<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Git workflow

Never push directly to `main`; every commit goes through a PR. See `docs/workflow/git-workflow.md`.

### Domain docs

Multi-context: a root `GLOSSARY-MAP.md` lists the Chat (`GLOSSARY.md`) and Factory (`docs/factory/GLOSSARY.md`) glossaries; all ADRs live in `docs/adr/`. See `docs/agents/domain.md`.

### Database

The Drizzle schema is the source of truth; generate migrations with `pnpm db:generate`, never hand-edit them. See `docs/adr/0003-drizzle-schema-is-source-of-truth.md`.

Generated IDs and timestamps are produced by the DB (column defaults, or `now()` / `now() + interval` in SQL), never passed from app code. Pass durations, not `Date`s. See `docs/adr/0004-db-generates-ids-and-created-timestamps.md`.

Avoid nullable columns and prefer DB-generated values (defaults, built-ins like `now()`) for data consistency. See `docs/adr/0005-avoid-nullable-columns-prefer-db-generated-values.md`.

### No assumptions

Don't assume; ask. Never add, remove or change a package without the ticket saying so. See `docs/workflow/no-assumptions.md`.

## Skill-generated files

The mattpocock skills generate the `## Agent skills` block above, `docs/agents/`, `docs/workflow/git-workflow.md`, `.agents/`, `.claude/skills/` and `skills-lock.json`. Ask the human before changing any of them, even in auto mode. If an edit prompts, wait for the answer. Never work around the prompt by writing the file through the shell (`sed`, `echo >`, `tee` and the like).

Known gaps in the enforcement (`permissions.ask` in `.claude/settings.json`): `bypassPermissions` mode skips prompts, and shell writes are not covered. Only the "never via the shell" rule above covers those. A rule can't target part of a file, so the whole root `AGENTS.md` prompts.
