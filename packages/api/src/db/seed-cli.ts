import { Pool } from 'pg';
import { loadConfig } from '../config/config.js';
import { assertNotProduction, SEED_PASSWORD, SEED_USERNAMES, seedDatabase } from './seed.js';

assertNotProduction(process.env);
const pool = new Pool({ connectionString: loadConfig(process.env).DATABASE_URL });
try {
  if (await seedDatabase(pool)) {
    console.log(`Seeded Users ${SEED_USERNAMES.join(', ')} (password: ${SEED_PASSWORD})`);
  } else {
    console.log('Already seeded, nothing changed');
  }
} finally {
  await pool.end();
}
