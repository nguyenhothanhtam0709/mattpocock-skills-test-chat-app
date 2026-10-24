# 02: Switch the skill config to multi-context glossaries

**What to build:** The human runs `/setup-matt-pocock-skills`, keeps the existing issue tracker (local markdown) and triage label answers, and picks **multi-context** for domain docs, so the skill rewrites its own `Domain docs` line in the `## Agent skills` block (and `docs/agents/domain.md` if it changes it). No agent edits these files. Commit the skill's output on its own branch and PR.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The `## Agent skills` block says multi-context and points to `docs/agents/domain.md`
- [x] The issue tracker and triage label config are unchanged
- [x] Only files the skill wrote are in the PR

## Comments
Human ran `/setup-matt-pocock-skills` (multi-context). Agent verified the diff: only `AGENTS.md` and `docs/agents/domain.md` changed; issue tracker and triage label docs untouched.
