import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, inject } from 'vitest';
import { truncateAllTables } from '../../test/database.js';

describe('membership note invariant', () => {
  let pool: Pool;
  let userId: string;
  let conversationId: string;
  let sequence: number;

  beforeAll(() => {
    pool = new Pool({ connectionString: inject('databaseUrl') });
  });
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await truncateAllTables(inject('databaseUrl'));
    userId = (
      await pool.query(
        `insert into users (username, email, password_hash) values ('n', 'n@example.com', 'x') returning id`,
      )
    ).rows[0].id;
    conversationId = (
      await pool.query(`insert into conversations (kind) values ('group') returning id`)
    ).rows[0].id;
    sequence = 0;
  });

  const insertMessage = async (kind: string, body: string): Promise<string> =>
    (
      await pool.query(
        `insert into messages (conversation_id, sender_id, sequence, kind, body)
         values ($1, $2, $3, $4, $5) returning id`,
        [conversationId, userId, ++sequence, kind, body],
      )
    ).rows[0].id;

  const insertNote = (messageId: string, kind: string) =>
    pool.query(`insert into membership_notes (message_id, kind, subject_id) values ($1, $2, $3)`, [
      messageId,
      kind,
      userId,
    ]);

  it('accepts a note with an empty body and a matching membership_notes row', async () => {
    const id = await insertMessage('member_added', '');
    await insertNote(id, 'member_added');
  });

  it('accepts a text message with a body', async () => {
    await insertMessage('text', 'hello');
  });

  it('rejects a note message that has a body', async () => {
    await expect(insertMessage('member_removed', 'oops')).rejects.toMatchObject({
      constraint: 'messages_note_body_check',
    });
  });

  it('rejects a membership_notes row for a text message', async () => {
    const id = await insertMessage('text', 'hello');
    await expect(insertNote(id, 'text')).rejects.toMatchObject({
      constraint: 'membership_notes_kind_check',
    });
    await expect(insertNote(id, 'member_added')).rejects.toMatchObject({
      constraint: 'membership_notes_message_kind_fk',
    });
  });

  it('rejects a membership_notes row whose kind differs from its message', async () => {
    const id = await insertMessage('member_left', '');
    await expect(insertNote(id, 'member_added')).rejects.toMatchObject({
      constraint: 'membership_notes_message_kind_fk',
    });
  });
});
