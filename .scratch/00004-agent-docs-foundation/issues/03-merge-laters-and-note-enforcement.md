# 03: Merge the laters files and note the enforcement work

**What to build:** One `docs/laters.md` holds every note for a later MVP. Move each entry from the root `laters.md` into it unchanged, delete the root file, and give the merged file one short intro: notes for a later MVP, not commitments; any agent may append an entry; an entry is removed when it becomes a spec. Add an entry "Enforce the doc and convention rules" listing: enforcement tags per rule and "broken twice, automate it"; required CI checks (lint, typecheck, tests with Postgres, migration drift, generated-doc drift, front matter and link check) with branch protection and a required human approval; the `covers:` check (a PR touching covered code without its Descriptive Doc fails unless the PR body justifies it); a Stop hook running fast checks; removing the agent's pre-approved PR merge permission; a periodic drift audit that opens Tickets. Update any reference to the root `laters.md`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every entry from both files is in `docs/laters.md`, text unchanged
- [ ] The root `laters.md` is gone and nothing links to it
- [ ] The enforcement entry lists all six items above
- [ ] `pnpm lint` passes

## Comments
