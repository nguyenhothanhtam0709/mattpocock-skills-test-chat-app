import { Pool } from 'pg';
import { afterAll, inject } from 'vitest';
import { PostgresTokenDenyList } from './postgres-token-deny-list.js';
import { describeTokenDenyListContract } from './token-deny-list.contract.js';

const pools: Pool[] = [];
afterAll(async () => {
  await Promise.all(pools.map((pool) => pool.end()));
});

describeTokenDenyListContract('Postgres', async () => {
  const pool = new Pool({ connectionString: inject('databaseUrl') });
  pools.push(pool);
  return {
    denyList: new PostgresTokenDenyList(pool),
    async expire(jti) {
      await pool.query(
        `update token_deny_list set expires_at = now() - interval '1 second' where jti = $1`,
        [jti],
      );
    },
  };
});
