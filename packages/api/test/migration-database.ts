import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { inject } from 'vitest';
import { runMigrations } from '../src/db/migrate.js';

const migrationsFolder = new URL('../drizzle', import.meta.url).pathname;

interface Journal {
  entries: { tag: string }[];
}

export interface MigrationDatabase {
  /** Connected to the fresh database. Seed it with plain SQL. */
  pool: Pool;
  /** Applies every migration after the named one, as `pnpm db:migrate` would. */
  migrateRest: () => Promise<void>;
}

/**
 * Gives the test its own fresh database in the run's Postgres, migrated up to and
 * including the migration `tag` (e.g. `0009_jittery_black_knight`), then drops it.
 * The shared test database is not touched.
 */
export async function withDatabaseMigratedUpTo(
  tag: string,
  test: (db: MigrationDatabase) => Promise<void>,
): Promise<void> {
  const name = `migration_test_${randomUUID().replaceAll('-', '')}`;
  const sharedUrl = inject('databaseUrl');
  const admin = new Pool({ connectionString: sharedUrl });
  await admin.query(`create database "${name}"`);

  const url = new URL(sharedUrl);
  url.pathname = `/${name}`;
  const pool = new Pool({ connectionString: url.toString() });
  try {
    await migrateUpTo(pool, tag);
    await test({ pool, migrateRest: () => runMigrations(pool) });
  } finally {
    await pool.end();
    await admin.query(`drop database "${name}" with (force)`);
    await admin.end();
  }
}

/** Runs Drizzle's migrator on a copy of the migrations folder whose journal ends at `tag`. */
async function migrateUpTo(pool: Pool, tag: string): Promise<void> {
  const journal = JSON.parse(
    await readFile(join(migrationsFolder, 'meta', '_journal.json'), 'utf8'),
  ) as Journal;
  const end = journal.entries.findIndex((entry) => entry.tag === tag);
  if (end === -1) throw new Error(`No migration named ${tag} in ${migrationsFolder}`);
  const entries = journal.entries.slice(0, end + 1);

  const folder = await mkdtemp(join(tmpdir(), 'migrations-'));
  try {
    await mkdir(join(folder, 'meta'));
    await writeFile(join(folder, 'meta', '_journal.json'), JSON.stringify({ ...journal, entries }));
    for (const entry of entries) {
      await copyFile(join(migrationsFolder, `${entry.tag}.sql`), join(folder, `${entry.tag}.sql`));
    }
    await migrate(drizzle(pool), { migrationsFolder: folder });
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
