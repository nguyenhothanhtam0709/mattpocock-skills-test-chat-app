import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module.js';
import { conversationMembers, groups } from '../db/schema.js';

/** Who is in which Group right now, for callers that must not read the tables themselves. */
@Injectable()
export class GroupMemberships {
  private readonly db: NodePgDatabase;

  constructor(@Inject(PG_POOL) pool: Pool) {
    this.db = drizzle(pool);
  }

  /** The IDs of the Groups the User is a current Member of. */
  async groupIdsOf(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: conversationMembers.conversationId })
      .from(conversationMembers)
      .innerJoin(groups, eq(groups.conversationId, conversationMembers.conversationId))
      .where(eq(conversationMembers.userId, userId));
    return rows.map((row) => row.id);
  }
}
