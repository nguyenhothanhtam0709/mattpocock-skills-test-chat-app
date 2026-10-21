# 46: Message list spacer grows without bound after a live message

**What to build:** Found while driving the web app in ticket 45. After a live message arrives or is sent in an open Conversation, the message list's spacer (`data-message-scroller-spacer`, from `@shadcn/react/message-scroller`) grows past 1M px. The Messages pane goes blank and the composer is pushed off screen until reload. It reproduced on all three browser pages (automated Chrome via Chrome DevTools MCP).

**Blocked by:** none

**Status:** ready-for-agent

- [ ] Reproduce in a real browser (confirm it is not specific to the automated Chrome) and find the cause (our usage of the message scroller vs the library)
- [ ] Fix so the Messages pane stays visible and the composer stays on screen after live and self-sent messages, in Direct and Group Conversations
- [ ] Regression test where jsdom can express it; otherwise record how it was verified in the browser
- [ ] No package changes (ask first if the fix needs one)

## Comments

- From ticket 45's walkthrough (see its Comments for details).
- Re-reported by the user ("the send message text box disappear after I send msg by press enter") and re-verified: it is not specific to Enter, and not dev-only.
  - Dev (`pnpm dev:web`, Chrome): in a Direct Conversation with 7 messages the layout is fine on open (document height 838, composer top 737). Sending with Enter made the whole page 5099 px tall with the composer at y=4998 (viewport 838). Sending with the Send button made it 182,524 px, composer at y=182,423.
  - Production build (`pnpm serve:web`): same, sending with Enter gave a 205,618 px page and the composer at y=205,517.
  - The document itself grows (`<main>` and the `sidebar-wrapper` are as tall as the page, `scrollY` 0), so the conversation pane is not height-constrained and the composer is pushed below the fold rather than the pane scrolling. The growth gets worse with each send. Reload restores the layout.
