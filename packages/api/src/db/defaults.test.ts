import { Pool } from 'pg';
import { describe, expect, it, inject } from 'vitest';
import { truncateAllTables } from '../../test/database.js';

describe('database defaults', () => {
  it('generates time-ordered ids and created-at timestamps for users and sessions', async () => {
    const pool = new Pool({ connectionString: inject('databaseUrl') });
    try {
      await truncateAllTables(inject('databaseUrl'));
      const user = await pool.query(
        `insert into users (username, email, password_hash) values ('d', 'd@example.com', 'x') returning id`,
      );
      const session = await pool.query(
        `insert into sessions (user_id, refresh_token_hash, rotated_at, expires_at)
         values ($1, 'h', now(), now()) returning id, created_at`,
        [user.rows[0].id],
      );
      expect(user.rows[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
      expect(session.rows[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-/);
      expect(session.rows[0].created_at).toBeInstanceOf(Date);
    } finally {
      await pool.end();
    }
  });
});
