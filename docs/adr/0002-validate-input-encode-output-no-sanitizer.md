# Validate on input, encode on output; no input sanitizer

User-supplied text is stored exactly as the user typed it (apart from Unicode NFC normalization and trimming of names). Zod schemas reject invalid input (control characters, bidi overrides in names) rather than silently rewriting it. XSS is prevented at the render sink: the SPA renders all user text as text (never `dangerouslySetInnerHTML`, enforced by lint) and a strict Content-Security-Policy is served via `@fastify/helmet`.

## Considered Options

- **HTML-stripping input sanitizer (e.g. `xss-clean`, DOMPurify on input)**: rejected. It corrupts legitimate Messages (`a < b`, `` `<div>` ``), guesses at an output context it can't know, and once bypassed the poisoned data is already stored. Do not add one to "fix" XSS; fix the sink instead.
