// Thin CLI behind `pnpm docs:generate`; run from the built `dist/`. Untested on purpose.
import { writeFileSync } from 'node:fs';
import { renderRealtimeEvents } from './realtime-events-doc.js';

writeFileSync(
  new URL('../../../docs/architecture/realtime-events.md', import.meta.url),
  renderRealtimeEvents(),
);
