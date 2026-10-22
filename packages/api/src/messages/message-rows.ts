import type { ConversationMember, Message } from '@chat/contracts';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase, NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { conversations, messages } from '../db/schema.js';

/**
 * A transaction of either the injected (schema-aware) database or a plain `drizzle(pool)`
 * (the seed CLI and tests), so the schema type argument is left open.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Tx = PgTransaction<NodePgQueryResultHKT, any, any>;
/** Where a rule check reads: inside the Conversation lock, the transaction. */
export type Reader = Pick<NodePgDatabase, 'select'>;
export type MessageRow = typeof messages.$inferSelect;

/** The one row a query is known to return (an insert's `returning`, a row just locked). */
export const exactlyOne = <T>(rows: T[], what: string): T => {
  const [row] = rows;
  if (row === undefined) throw new Error(`Expected ${what}`);
  return row;
};

export const toMessage = (row: MessageRow, subject?: ConversationMember | null): Message => ({
  id: row.id,
  conversationId: row.conversationId,
  senderId: row.senderId,
  sequence: row.sequence,
  clientMessageId: row.clientMessageId,
  kind: row.kind,
  body: row.body,
  ...(subject ? { subject } : {}),
  createdAt: row.createdAt.toISOString(),
});

/**
 * Bumps the Conversation's counter (taking its row lock until commit) and returns the new
 * value, so sequences are strictly increasing in commit order.
 */
export async function nextSequence(tx: Tx, conversationId: string): Promise<number> {
  const counter = exactlyOne(
    await tx
      .update(conversations)
      .set({ lastSequence: sql`${conversations.lastSequence} + 1` })
      .where(eq(conversations.id, conversationId))
      .returning({ sequence: conversations.lastSequence }),
    'the Conversation counter',
  );
  return counter.sequence;
}
