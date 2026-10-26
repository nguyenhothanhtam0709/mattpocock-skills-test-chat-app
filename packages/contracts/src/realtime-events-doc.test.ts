import { describe, expect, it } from 'vitest';
import { RealtimeEvent } from './realtime.js';
import { renderRealtimeEvents } from './realtime-events-doc.js';

describe('realtime events doc', () => {
  const markdown = renderRealtimeEvents();

  it('declares itself generated', () => {
    expect(markdown).toMatch(
      /^---\nkind: generated\ngenerator: packages\/contracts\/src\/realtime-events-doc\.ts\nsource: packages\/contracts\/src\/realtime\.ts\n---\n/,
    );
    expect(markdown).toContain('Do not edit');
  });

  it('lists every event name', () => {
    for (const name of Object.values(RealtimeEvent)) {
      expect(markdown).toContain(`## \`${name}\``);
    }
  });

  it('shows the payload fields of an event, nested ones included', () => {
    const section = markdown.split('## `group.owner_changed`')[1]?.split('\n## ')[0];
    expect(section).toContain('conversationId: string; // uuid');
    expect(section).toContain('ownerId: string; // uuid');

    const created = markdown.split('## `message.created`')[1]?.split('\n## ')[0];
    expect(created).toContain('message: {');
    expect(created).toContain('sequence: number; // integer');
    expect(created).toContain("kind: 'text' | 'member_added'");
  });

  it('shows an empty payload as an empty object', () => {
    const section = markdown.split('## `session.revoked`')[1]?.split('\n## ')[0];
    expect(section).toContain('{}');
  });
});
