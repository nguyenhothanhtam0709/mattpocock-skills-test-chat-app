import { Pool } from 'pg';
import { loadConfig } from '../config/config.js';
import { runMigrations } from './migrate.js';

const pool = new Pool({ connectionString: loadConfig(process.env).DATABASE_URL });
try {
  await runMigrations(pool);
  console.log('Migrations applied');
} finally {
  await pool.end();
}
