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
