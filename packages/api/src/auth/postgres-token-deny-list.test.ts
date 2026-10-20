import { Pool } from 'pg';
import { afterAll, inject } from 'vitest';
import { PostgresTokenDenyList } from './postgres-token-deny-list.js';
import { describeTokenDenyListContract } from './token-deny-list.contract.js';

const pools: Pool[] = [];
afterAll(async () => {
  await Promise.all(pools.map((pool) => pool.end()));
});

describeTokenDenyListContract('Postgres', async (clock) => {
  const pool = new Pool({ connectionString: inject('databaseUrl') });
  pools.push(pool);
  return new PostgresTokenDenyList(pool, clock);
});
