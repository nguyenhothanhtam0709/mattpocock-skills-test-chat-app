import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { conversations } from '../db/schema.js';
import { KeyedSerializer, type Slot } from '../realtime/keyed-serializer.js';

/**
 * The one place that orders what follows a commit on a Conversation. One instance serves every
 * writer of a Conversation (Message sends and membership changes), because slot order only
 * equals commit order when they all share the same serializer.
 */
@Injectable()
export class CommitOrder {
  private readonly slots = new KeyedSerializer();

  /**
   * Runs a transaction that calls `queue()` right after taking the Conversation lock, then
   * `after` with its result, once every earlier change of the Conversation has finished its
   * own `after`. Room changes and pushes therefore happen in commit order: a Message is never
   * pushed between a membership commit and its room change.
   */
  async run<R, T>(
    conversationId: string,
    transaction: (queue: () => void) => Promise<R>,
    after: (result: R) => Promise<T>,
  ): Promise<T> {
    const held: { slot?: Slot } = {};
    try {
      const result = await transaction(() => {
        held.slot = this.slots.enter(conversationId);
      });
      await held.slot?.turn;
      return await after(result);
    } finally {
      held.slot?.release();
    }
  }
}

/** Serialises membership changes and Message sends on one Conversation. */
export async function lockConversation(
  tx: Pick<NodePgDatabase, 'execute'>,
  conversationId: string,
): Promise<void> {
  await tx.execute(
    sql`select 1 from ${conversations} where ${conversations.id} = ${conversationId} for update`,
  );
}
