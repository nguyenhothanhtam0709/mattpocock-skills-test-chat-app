import { getDrizzleToken } from '@nestjs/drizzle';
import { sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { withApp } from '../../test/app-harness.js';
import { PG_POOL, type Database } from './database.module.js';

describe('DatabaseModule', () => {
  it('registers a Drizzle database built on the instrumented pool the health check uses', async () => {
    await withApp({}, async (app) => {
      const db = app.get<Database>(getDrizzleToken(), { strict: false });

      const result = await db.execute(sql`select 1 as one`);

      expect(result.rows).toEqual([{ one: 1 }]);
      expect(db.$client).toBe(app.get(PG_POOL, { strict: false }));
    });
  });
});
