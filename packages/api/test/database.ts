import { Pool } from 'pg';

/** Truncates every application table (not Drizzle's migration bookkeeping). */
export async function truncateAllTables(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const { rows } = await pool.query<{ tablename: string }>(
      `select tablename from pg_tables where schemaname = 'public'`,
    );
    if (rows.length === 0) return;
    const names = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
    await pool.query(`truncate table ${names} restart identity cascade`);
  } finally {
    await pool.end();
  }
}
