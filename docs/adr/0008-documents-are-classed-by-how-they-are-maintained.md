# Documents are classed by how they are maintained

Agents only know what is written down, and nothing said which doc wins when a doc and the code disagree, or which docs may be hand-edited. Every doc now belongs to exactly one of three kinds, declared as `kind: intent | generated | descriptive` in its YAML front matter. Some docs are exempt:

- Specs, Tickets and ADRs: their location implies their kind.
- `docs/laters.md`: a backlog of notes, not commitments, so it must not outrank the code.
- Files the mattpocock skills generate (the root `AGENTS.md`, `docs/agents/`, `docs/workflow/git-workflow.md`): the skills own and rewrite them.

- **Intent Doc**: why / what should be. It outranks the code. Code that contradicts it is the defect, unless a new ADR changes the decision.
- **Generated Doc**: produced from the code by a script, never hand-edited. The code outranks it, so a mismatch means regenerating it. It also declares `generator` and `source`.
- **Descriptive Doc**: hand-written, says how it works today. The code outranks it, so a mismatch means the doc is the defect.

A doc is updated in the same pull request as the change that affects it.

## Considered Options

- **No kinds, every doc hand-written**: rejected. Docs would drift silently and agents could not tell which side to fix.
- **Docs always outrank code**: rejected. Descriptions of current behaviour would then block correct code changes.
- **A periodic drift audit instead of same-PR updates**: rejected for now. It lets docs be wrong between audits; it stays in `docs/laters.md` as a later addition.
