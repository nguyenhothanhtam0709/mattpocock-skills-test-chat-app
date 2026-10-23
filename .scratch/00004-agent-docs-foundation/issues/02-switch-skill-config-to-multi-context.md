# 02: Switch the skill config to multi-context glossaries

**What to build:** The human runs `/setup-matt-pocock-skills`, keeps the existing issue tracker (local markdown) and triage label answers, and picks **multi-context** for domain docs, so the skill rewrites its own `Domain docs` line in the `## Agent skills` block (and `docs/agents/domain.md` if it changes it). No agent edits these files. Commit the skill's output on its own branch and PR.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [ ] The `## Agent skills` block says multi-context and points to `docs/agents/domain.md`
- [ ] The issue tracker and triage label config are unchanged
- [ ] Only files the skill wrote are in the PR

## Comments
