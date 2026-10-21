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
