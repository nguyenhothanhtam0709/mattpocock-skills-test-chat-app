import { describe, expect, it } from 'vitest';
import * as schema from '../db/schema.js';
import { renderErDiagram } from './er-diagram.js';

describe('ER diagram doc', () => {
  const markdown = renderErDiagram(schema);

  it('declares itself generated', () => {
    expect(markdown).toMatch(
      /^---\nkind: generated\ngenerator: packages\/api\/src\/docs\/er-diagram\.ts\nsource: packages\/api\/src\/db\/schema\.ts\n---\n/,
    );
    expect(markdown).toContain('Do not edit');
    expect(markdown).toContain('```mermaid\nerDiagram\n');
  });

  it('draws every table with typed columns, keys and nullability', () => {
    const users = markdown.split('  users {\n')[1]?.split('  }')[0];
    expect(users).toContain('    uuid id PK\n');
    expect(users).toContain('    text username\n');
    expect(users).toContain('    text nickname "nullable"\n');
    expect(users).toContain('    timestamptz created_at\n');

    expect(markdown).toContain('  messages {\n');
    expect(markdown).toContain('  token_deny_list {\n');
  });

  it('draws foreign keys as relationships labelled with the column', () => {
    expect(markdown).toContain('  users ||--o{ sessions : "user_id"\n');
    expect(markdown).toContain('  conversations ||--o{ messages : "conversation_id"\n');
    // A foreign key that is the whole primary key is one-to-one.
    expect(markdown).toContain('  conversations ||--|| groups : "conversation_id"\n');
    // Composite foreign key.
    expect(markdown).toContain('  messages ||--o{ system_messages : "message_id, kind"\n');
  });

  it('marks a primary-key column that is also a foreign key as PK, FK', () => {
    const members = markdown.split('  conversation_members {\n')[1]?.split('  }')[0];
    expect(members).toContain('    uuid user_id PK, FK\n');
  });
});
