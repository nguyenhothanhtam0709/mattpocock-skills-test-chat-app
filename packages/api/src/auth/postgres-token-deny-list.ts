import { and, eq, gt, lte } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import type { Clock } from '../clock/clock.js';
import { tokenDenyList } from '../db/schema.js';
import type { TokenDenyList } from './token-deny-list.js';

export class PostgresTokenDenyList implements TokenDenyList {
  private readonly db: NodePgDatabase;

  constructor(
    pool: Pool,
    private readonly clock: Clock,
  ) {
    this.db = drizzle(pool);
  }

  async add(jti: string, expiresAt: Date): Promise<void> {
    await this.db
      .insert(tokenDenyList)
      .values({ jti, expiresAt })
      .onConflictDoUpdate({ target: tokenDenyList.jti, set: { expiresAt } });
  }

  async isDenied(jti: string): Promise<boolean> {
    const rows = await this.db
      .select({ jti: tokenDenyList.jti })
      .from(tokenDenyList)
      .where(and(eq(tokenDenyList.jti, jti), gt(tokenDenyList.expiresAt, this.clock.now())))
      .limit(1);
    return rows.length > 0;
  }

  async sweepExpired(): Promise<number> {
    const removed = await this.db
      .delete(tokenDenyList)
      .where(lte(tokenDenyList.expiresAt, this.clock.now()))
      .returning({ jti: tokenDenyList.jti });
    return removed.length;
  }
}
