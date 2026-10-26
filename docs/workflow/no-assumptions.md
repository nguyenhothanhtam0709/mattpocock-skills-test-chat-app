---
kind: intent
---

# No assumptions

## Rules

- You MUST NOT assume. If the ticket, spec, ADRs and code do not settle a question, ask the human before acting.
- You MUST NOT add, remove, upgrade or swap a package (any `package.json` dependency, lockfile-driving change, or Docker/base image version) unless the ticket says so. If you think one is needed, stop and ask first.
- You MUST NOT widen a ticket's scope or change behaviour the ticket did not mention. Raise it instead.
- If you do have to proceed on a guess, say so explicitly in the PR description and the ticket's `## Comments`, listing each assumption. Do not bury it.
