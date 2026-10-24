# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`GLOSSARY-MAP.md`** at the repo root: it lists each context and points at its `GLOSSARY.md`. Read each one relevant to the topic.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in. All ADRs live here under one numbering; there are no per-context ADR folders.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Multi-context, two contexts:

```
/
├── GLOSSARY-MAP.md        ← lists the contexts and their relationships
├── GLOSSARY.md            ← Chat: the product's domain
├── docs/
│   ├── adr/               ← all decisions, both contexts
│   └── factory/
│       └── GLOSSARY.md    ← Factory: the agent pipeline's process terms
└── packages/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_
