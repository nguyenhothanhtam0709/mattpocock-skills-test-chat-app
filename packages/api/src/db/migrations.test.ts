import { Pool } from 'pg';
import { describe, expect, it, inject } from 'vitest';
import { withDatabaseMigratedUpTo } from '../../test/migration-database.js';

const alice = '00000000-0000-7000-8000-000000000001';
const bob = '00000000-0000-7000-8000-000000000002';
const conversation = '00000000-0000-7000-8000-0000000000c1';

describe('migrations', () => {
  it('0010 gives every existing Message the kind text', async () => {
    await withDatabaseMigratedUpTo('0009_jittery_black_knight', async ({ pool, migrateRest }) => {
      await expect(pool.query(`select kind from messages`)).rejects.toThrow(
        'column "kind" does not exist',
      );
      await pool.query(`
        insert into users (id, username, email, password_hash) values
          ('${alice}', 'alice', 'alice@example.com', 'x'),
          ('${bob}', 'bob', 'bob@example.com', 'x');
        insert into conversations (id, kind, last_sequence) values ('${conversation}', 'direct', 2);
        insert into messages (conversation_id, sender_id, sequence, client_message_id, body) values
          ('${conversation}', '${alice}', 1, gen_random_uuid(), 'hi'),
          ('${conversation}', '${bob}', 2, gen_random_uuid(), 'hello');
      `);

      await migrateRest();

      const { rows } = await pool.query<{ sequence: number; kind: string }>(
        `select sequence, kind from messages order by sequence`,
      );
      expect(rows).toEqual([
        { sequence: 1, kind: 'text' },
        { sequence: 2, kind: 'text' },
      ]);
    });
  });
});

describe('migration test database', () => {
  it('leaves the shared test database untouched', async () => {
    await withDatabaseMigratedUpTo('0001_medical_moonstone', async ({ pool, migrateRest }) => {
      await pool.query(
        `insert into users (id, username, email, password_hash) values ('${alice}', 'alice', 'alice@example.com', 'x')`,
      );
      await migrateRest();
    });

    const shared = new Pool({ connectionString: inject('databaseUrl') });
    try {
      const { rows } = await shared.query<{ n: number }>(`select count(*)::int as n from users`);
      expect(rows[0]?.n).toBe(0);
    } finally {
      await shared.end();
    }
  });

  it('rejects a migration name that does not exist', async () => {
    await expect(
      withDatabaseMigratedUpTo('9999_no_such_migration', async () => {}),
    ).rejects.toThrow('No migration named 9999_no_such_migration');
  });
});
