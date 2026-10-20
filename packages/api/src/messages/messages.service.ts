import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  ErrorCode,
  LAST_MESSAGE_PREVIEW_MAX,
  type Conversation,
  type ConversationMember,
  type GetConversationResponse,
  type GetMessagesQuery,
  type GetMessagesResponse,
  type ListConversationsResponse,
  type Message,
  type SendDirectMessageRequest,
  type SendMessageRequest,
} from '@chat/contracts';
import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import { DomainException } from '../common/all-exceptions.filter.js';
import { PG_POOL } from '../db/database.module.js';
import {
  conversationMembers,
  conversations,
  directConversations,
  messages,
  users,
} from '../db/schema.js';

type Tx = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];
type MessageRow = typeof messages.$inferSelect;

export interface SentMessage {
  message: Message;
  /** False when the client message ID had been used before and the original is returned. */
  created: boolean;
}

/** Thrown inside a transaction to undo it (including its sequence bump) on a resend. */
class DuplicateClientMessage extends Error {}

const toMessage = (row: MessageRow): Message => ({
  id: row.id,
  conversationId: row.conversationId,
  senderId: row.senderId,
  sequence: row.sequence,
  clientMessageId: row.clientMessageId,
  body: row.body,
  createdAt: row.createdAt.toISOString(),
});

const conversationNotFound = () =>
  new DomainException(
    ErrorCode.CONVERSATION_NOT_FOUND,
    HttpStatus.NOT_FOUND,
    'Conversation not found',
  );

@Injectable()
export class MessagesService {
  private readonly db: NodePgDatabase;

  constructor(@Inject(PG_POOL) pool: Pool) {
    this.db = drizzle(pool);
  }

  /** Sends to a User, creating the Direct Conversation with the first Message. */
  async sendDirect(
    senderId: string,
    request: SendDirectMessageRequest,
  ): Promise<SentMessage & { conversation: Conversation }> {
    const { recipientId, clientMessageId, body } = request;
    if (recipientId === senderId) {
      throw new DomainException(
        ErrorCode.CANNOT_MESSAGE_SELF,
        HttpStatus.BAD_REQUEST,
        'You cannot message yourself',
      );
    }
    const [recipient] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, recipientId));
    if (!recipient) {
      throw new DomainException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, 'User not found');
    }

    const original = await this.findByClientMessageId(senderId, clientMessageId);
    if (original) return this.asDirectResult(original);

    try {
      const message = await this.db.transaction(async (tx) => {
        const conversationId = await this.findOrCreateDirect(tx, senderId, recipientId);
        return this.insertMessage(tx, conversationId, senderId, { clientMessageId, body });
      });
      return this.asDirectResult({ message, created: true });
    } catch (error) {
      if (!(error instanceof DuplicateClientMessage)) throw error;
      const raced = await this.findByClientMessageId(senderId, clientMessageId);
      return this.asDirectResult(raced!);
    }
  }

  /** Sends to a Conversation the caller is a Member of. */
  async send(
    senderId: string,
    conversationId: string,
    request: SendMessageRequest,
  ): Promise<SentMessage> {
    await this.requireMember(conversationId, senderId);
    try {
      const message = await this.db.transaction((tx) =>
        this.insertMessage(tx, conversationId, senderId, request),
      );
      return { message, created: true };
    } catch (error) {
      if (!(error instanceof DuplicateClientMessage)) throw error;
      return (await this.findByClientMessageId(senderId, request.clientMessageId))!;
    }
  }

  /**
   * Newest first by default, or only those `before` a sequence number; with `after`, the
   * Messages following it, oldest first.
   */
  async history(
    userId: string,
    conversationId: string,
    { limit, before, after }: GetMessagesQuery,
  ): Promise<GetMessagesResponse> {
    await this.requireMember(conversationId, userId);
    const forward = after !== undefined;
    const rows = await this.db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          before === undefined ? undefined : lt(messages.sequence, before),
          forward ? gt(messages.sequence, after) : undefined,
        ),
      )
      .orderBy(forward ? asc(messages.sequence) : desc(messages.sequence))
      .limit(limit + 1);
    return { messages: rows.slice(0, limit).map(toMessage), hasMore: rows.length > limit };
  }

  /** The caller's Conversations, newest last Message first. */
  async list(userId: string): Promise<ListConversationsResponse> {
    const rows = await this.db
      .select({
        id: conversations.id,
        kind: conversations.kind,
        senderId: messages.senderId,
        preview: sql<string>`left(regexp_replace(trim(${messages.body}), '\\s+', ' ', 'g'), ${LAST_MESSAGE_PREVIEW_MAX})`,
        createdAt: messages.createdAt,
      })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
      .innerJoin(
        messages,
        and(
          eq(messages.conversationId, conversations.id),
          eq(messages.sequence, conversations.lastSequence),
        ),
      )
      .where(eq(conversationMembers.userId, userId))
      .orderBy(desc(messages.createdAt), desc(conversations.id));
    const members = await this.membersOf(rows.map((r) => r.id));
    return {
      conversations: rows.map((row) => {
        const all = members.get(row.id) ?? [];
        const other = all.find((m) => m.id !== userId) ?? all[0]!;
        return {
          id: row.id,
          kind: 'direct' as const,
          name: other.nickname ?? other.username,
          members: all,
          lastMessage: {
            senderId: row.senderId,
            preview: row.preview,
            createdAt: row.createdAt.toISOString(),
          },
        };
      }),
    };
  }

  async get(userId: string, conversationId: string): Promise<GetConversationResponse> {
    await this.requireMember(conversationId, userId);
    const members = await this.membersOf([conversationId]);
    return {
      conversation: { id: conversationId, kind: 'direct', members: members.get(conversationId)! },
    };
  }

  private async membersOf(conversationIds: string[]): Promise<Map<string, ConversationMember[]>> {
    const byConversation = new Map<string, ConversationMember[]>();
    if (conversationIds.length === 0) return byConversation;
    const rows = await this.db
      .select({
        conversationId: conversationMembers.conversationId,
        id: users.id,
        username: users.username,
        nickname: users.nickname,
      })
      .from(conversationMembers)
      .innerJoin(users, eq(users.id, conversationMembers.userId))
      .where(inArray(conversationMembers.conversationId, conversationIds))
      .orderBy(users.id);
    for (const { conversationId, ...member } of rows) {
      byConversation.set(conversationId, [...(byConversation.get(conversationId) ?? []), member]);
    }
    return byConversation;
  }

  private async requireMember(conversationId: string, userId: string): Promise<void> {
    const [member] = await this.db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      );
    if (!member) throw conversationNotFound();
  }

  private async findByClientMessageId(
    senderId: string,
    clientMessageId: string,
  ): Promise<SentMessage | undefined> {
    const [row] = await this.db
      .select()
      .from(messages)
      .where(and(eq(messages.senderId, senderId), eq(messages.clientMessageId, clientMessageId)));
    return row && { message: toMessage(row), created: false };
  }

  private async asDirectResult(
    sent: SentMessage,
  ): Promise<SentMessage & { conversation: Conversation }> {
    const members = await this.db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, sent.message.conversationId));
    return {
      ...sent,
      conversation: {
        id: sent.message.conversationId,
        kind: 'direct',
        memberIds: members.map((m) => m.userId),
      },
    };
  }

  /**
   * The pair's unique index decides the winner of concurrent first sends: the loser's insert
   * waits for the winner to commit, does nothing, and the loser discards its own Conversation.
   */
  private async findOrCreateDirect(tx: Tx, a: string, b: string): Promise<string> {
    const [low, high] = a < b ? [a, b] : [b, a];
    const pair = and(
      eq(directConversations.lowUserId, low),
      eq(directConversations.highUserId, high),
    );
    const [existing] = await tx
      .select({ id: directConversations.conversationId })
      .from(directConversations)
      .where(pair);
    if (existing) return existing.id;

    const [created] = await tx
      .insert(conversations)
      .values({ kind: 'direct' })
      .returning({ id: conversations.id });
    const [won] = await tx
      .insert(directConversations)
      .values({ conversationId: created!.id, lowUserId: low, highUserId: high })
      .onConflictDoNothing()
      .returning({ id: directConversations.conversationId });
    if (won) {
      await tx.insert(conversationMembers).values([
        { conversationId: created!.id, userId: low },
        { conversationId: created!.id, userId: high },
      ]);
      return created!.id;
    }
    await tx.delete(conversations).where(eq(conversations.id, created!.id));
    const [winner] = await tx
      .select({ id: directConversations.conversationId })
      .from(directConversations)
      .where(pair);
    return winner!.id;
  }

  /**
   * Bumps the Conversation's counter (taking its row lock until commit) and inserts the Message
   * with the new value, so sequences are strictly increasing in commit order.
   */
  private async insertMessage(
    tx: Tx,
    conversationId: string,
    senderId: string,
    request: SendMessageRequest,
  ): Promise<Message> {
    const [counter] = await tx
      .update(conversations)
      .set({ lastSequence: sql`${conversations.lastSequence} + 1` })
      .where(eq(conversations.id, conversationId))
      .returning({ sequence: conversations.lastSequence });
    const [row] = await tx
      .insert(messages)
      .values({
        conversationId,
        senderId,
        sequence: counter!.sequence,
        clientMessageId: request.clientMessageId,
        body: request.body,
      })
      .onConflictDoNothing({ target: [messages.senderId, messages.clientMessageId] })
      .returning();
    if (!row) throw new DuplicateClientMessage();
    return toMessage(row);
  }
}
