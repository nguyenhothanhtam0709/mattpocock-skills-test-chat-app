import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  ErrorCode,
  LAST_MESSAGE_PREVIEW_MAX,
  type Conversation,
  type ConversationSummary,
  RealtimeEvent,
  type ConversationMember,
  type CreateGroupRequest,
  type CreateGroupResponse,
  GROUP_MEMBERS_MAX,
  type GetConversationResponse,
  type GetMessagesQuery,
  type GroupMembershipResponse,
  type GetMessagesResponse,
  type ListConversationsResponse,
  type Message,
  type SendDirectMessageRequest,
  type SendMessageRequest,
} from '@chat/contracts';
import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import type { Logger } from 'pino';
import { PINO } from '../logging/logging.module.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { DomainException } from '../common/all-exceptions.filter.js';
import { PG_POOL } from '../db/database.module.js';
import {
  conversationMembers,
  conversations,
  directConversations,
  groups,
  messages,
  removedGroupMembers,
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

  constructor(
    @Inject(PG_POOL) pool: Pool,
    private readonly realtime: RealtimeGateway,
    @Inject(PINO) private readonly logger: Logger,
  ) {
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
      const { message, newConversation } = await this.db.transaction(async (tx) => {
        const direct = await this.findOrCreateDirect(tx, senderId, recipientId);
        const inserted = await this.insertMessage(tx, direct.id, senderId, {
          clientMessageId,
          body,
        });
        return { message: inserted, newConversation: direct.created };
      });
      await this.pushCreated(message, newConversation ? recipientId : undefined);
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
    await this.requireMember(conversationId, senderId, true);
    try {
      const message = await this.db.transaction((tx) =>
        this.insertMessage(tx, conversationId, senderId, request),
      );
      await this.pushCreated(message, undefined);
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
    return { conversations: await this.summaries(userId) };
  }

  /**
   * Pushes a saved Message to every Member (the sender's other tabs too). When the Direct
   * Conversation was just created, its recipient first gets the Conversation itself. Push is
   * best-effort (ADR-0001): a failure is logged and never fails the send.
   */
  private async pushCreated(message: Message, newConversationRecipient: string | undefined) {
    try {
      const members = await this.db
        .select({ userId: conversationMembers.userId })
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, message.conversationId));
      if (newConversationRecipient) {
        const [conversation] = await this.summaries(
          newConversationRecipient,
          message.conversationId,
        );
        this.realtime.push(
          RealtimeEvent.CONVERSATION_CREATED,
          [newConversationRecipient],
          { conversation },
          message.conversationId,
        );
      }
      this.realtime.push(
        RealtimeEvent.MESSAGE_CREATED,
        members.map((m) => m.userId),
        { message },
        message.conversationId,
      );
    } catch (error) {
      this.logger.error(
        { err: error, conversationId: message.conversationId },
        'socket push failed',
      );
    }
  }

  private async summaries(
    userId: string,
    onlyConversationId?: string,
  ): Promise<ConversationSummary[]> {
    const rows = await this.db
      .select({
        id: conversations.id,
        kind: conversations.kind,
        groupName: groups.name,
        senderId: messages.senderId,
        preview: sql<
          string | null
        >`left(regexp_replace(trim(${messages.body}), '\\s+', ' ', 'g'), ${LAST_MESSAGE_PREVIEW_MAX})`,
        createdAt: messages.createdAt,
      })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
      .leftJoin(groups, eq(groups.conversationId, conversations.id))
      .leftJoin(
        messages,
        and(
          eq(messages.conversationId, conversations.id),
          eq(messages.sequence, conversations.lastSequence),
        ),
      )
      .where(
        and(
          eq(conversationMembers.userId, userId),
          onlyConversationId === undefined ? undefined : eq(conversations.id, onlyConversationId),
        ),
      )
      .orderBy(
        desc(sql`coalesce(${messages.createdAt}, ${conversations.createdAt})`),
        desc(conversations.id),
      );
    const members = await this.membersOf(rows.map((r) => r.id));
    return rows.map((row) => {
      const all = members.get(row.id) ?? [];
      const other = all.find((m) => m.id !== userId) ?? all[0]!;
      return {
        id: row.id,
        kind: row.groupName === null ? ('direct' as const) : ('group' as const),
        name: row.groupName ?? other.nickname ?? other.username,
        members: all,
        lastMessage:
          row.senderId === null
            ? null
            : {
                senderId: row.senderId,
                preview: row.preview!,
                createdAt: row.createdAt!.toISOString(),
              },
      };
    });
  }

  async get(userId: string, conversationId: string): Promise<GetConversationResponse> {
    await this.requireMember(conversationId, userId);
    const members = (await this.membersOf([conversationId])).get(conversationId)!;
    const [group] = await this.db
      .select({ name: groups.name, ownerId: groups.ownerId })
      .from(groups)
      .where(eq(groups.conversationId, conversationId));
    return {
      conversation: group
        ? { id: conversationId, kind: 'group', ...group, members }
        : { id: conversationId, kind: 'direct', members },
    };
  }

  /**
   * Creates a Group owned by `ownerId`, with the Owner and the distinct initial Members as
   * Members, and pushes the new Conversation to each of them. Push is best-effort (ADR-0001).
   */
  async createGroup(ownerId: string, request: CreateGroupRequest): Promise<CreateGroupResponse> {
    const name = request.name.trim();
    const memberIds = [...new Set([ownerId, ...request.memberIds])];
    if (memberIds.length > GROUP_MEMBERS_MAX) {
      throw new DomainException(
        ErrorCode.GROUP_FULL,
        HttpStatus.CONFLICT,
        `A Group has at most ${GROUP_MEMBERS_MAX} Members`,
      );
    }
    const found = await this.db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, memberIds));
    const known = new Set(found.map((u) => u.id));
    const unknown = memberIds.filter((id) => !known.has(id));
    if (unknown.length > 0) {
      throw new DomainException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, 'User not found', {
        userIds: unknown,
      });
    }

    const id = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(conversations)
        .values({ kind: 'group' })
        .returning({ id: conversations.id });
      await tx.insert(groups).values({ conversationId: created!.id, name, ownerId });
      await tx
        .insert(conversationMembers)
        .values(memberIds.map((userId) => ({ conversationId: created!.id, userId })));
      return created!.id;
    });

    const members = (await this.membersOf([id])).get(id)!;
    await this.pushGroupCreated(id, memberIds);
    return { conversation: { id, kind: 'group', name, ownerId, members } };
  }

  private async pushGroupCreated(conversationId: string, memberIds: string[]) {
    try {
      const [conversation] = await this.summaries(memberIds[0]!, conversationId);
      this.realtime.push(
        RealtimeEvent.CONVERSATION_CREATED,
        memberIds,
        { conversation },
        conversationId,
      );
    } catch (error) {
      this.logger.error({ err: error, conversationId }, 'socket push failed');
    }
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

  /** With `forPosting`, a User the Owner removed is told so instead of getting a 404. */
  private async requireMember(
    conversationId: string,
    userId: string,
    forPosting = false,
  ): Promise<void> {
    const [member] = await this.db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(
        and(
          eq(conversationMembers.conversationId, conversationId),
          eq(conversationMembers.userId, userId),
        ),
      );
    if (member) return;
    if (forPosting) {
      const [removed] = await this.db
        .select({ userId: removedGroupMembers.userId })
        .from(removedGroupMembers)
        .where(
          and(
            eq(removedGroupMembers.conversationId, conversationId),
            eq(removedGroupMembers.userId, userId),
          ),
        );
      if (removed) {
        throw new DomainException(
          ErrorCode.NOT_A_MEMBER,
          HttpStatus.FORBIDDEN,
          'You are no longer a Member of this Group',
        );
      }
    }
    throw conversationNotFound();
  }

  /** The Group the caller is a Member of, and whether the caller owns it; else 404. */
  private async requireOwner(callerId: string, groupId: string): Promise<void> {
    const [group] = await this.db
      .select({ ownerId: groups.ownerId })
      .from(groups)
      .where(eq(groups.conversationId, groupId));
    if (!group) throw conversationNotFound();
    await this.requireMember(groupId, callerId);
    if (group.ownerId !== callerId) {
      throw new DomainException(
        ErrorCode.NOT_GROUP_OWNER,
        HttpStatus.FORBIDDEN,
        'Only the Owner can change the Members',
      );
    }
  }

  private async memberRow(userId: string) {
    const [row] = await this.db
      .select({ id: users.id, username: users.username, nickname: users.nickname })
      .from(users)
      .where(eq(users.id, userId));
    return row;
  }

  /**
   * The Owner adds a User, who is a Member at once. The Conversation row is locked so that the
   * 256-Member cap holds under concurrent adds. Pushes are best-effort (ADR-0001).
   */
  async addGroupMember(
    callerId: string,
    groupId: string,
    userId: string,
  ): Promise<GroupMembershipResponse> {
    await this.requireOwner(callerId, groupId);
    const member = await this.memberRow(userId);
    if (!member) {
      throw new DomainException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND, 'User not found');
    }
    await this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select 1 from ${conversations} where ${conversations.id} = ${groupId} for update`,
      );
      const current = await tx
        .select({ userId: conversationMembers.userId })
        .from(conversationMembers)
        .where(eq(conversationMembers.conversationId, groupId));
      if (current.some((m) => m.userId === userId)) {
        throw new DomainException(
          ErrorCode.ALREADY_A_MEMBER,
          HttpStatus.CONFLICT,
          'Already a Member of this Group',
        );
      }
      if (current.length >= GROUP_MEMBERS_MAX) {
        throw new DomainException(
          ErrorCode.GROUP_FULL,
          HttpStatus.CONFLICT,
          `A Group has at most ${GROUP_MEMBERS_MAX} Members`,
        );
      }
      await tx.insert(conversationMembers).values({ conversationId: groupId, userId });
      await tx
        .delete(removedGroupMembers)
        .where(
          and(
            eq(removedGroupMembers.conversationId, groupId),
            eq(removedGroupMembers.userId, userId),
          ),
        );
    });

    const { conversation } = await this.get(callerId, groupId);
    try {
      const [summary] = await this.summaries(userId, groupId);
      this.realtime.push(
        RealtimeEvent.CONVERSATION_CREATED,
        [userId],
        { conversation: summary },
        groupId,
      );
      this.realtime.push(
        RealtimeEvent.GROUP_MEMBER_ADDED,
        conversation.members.map((m) => m.id),
        { conversationId: groupId, member },
        groupId,
      );
    } catch (error) {
      this.logger.error({ err: error, conversationId: groupId }, 'socket push failed');
    }
    return { conversation: conversation as GroupMembershipResponse['conversation'] };
  }

  /** The Owner removes a Member (never themselves). The removed User gets no more pushes. */
  async removeGroupMember(
    callerId: string,
    groupId: string,
    userId: string,
  ): Promise<GroupMembershipResponse> {
    await this.requireOwner(callerId, groupId);
    if (userId === callerId) {
      throw new DomainException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'The Owner cannot be removed from their Group',
      );
    }
    const member = await this.memberRow(userId);
    const removed = await this.db.transaction(async (tx) => {
      const deleted = await tx
        .delete(conversationMembers)
        .where(
          and(
            eq(conversationMembers.conversationId, groupId),
            eq(conversationMembers.userId, userId),
          ),
        )
        .returning({ userId: conversationMembers.userId });
      if (deleted.length === 0) return false;
      await tx
        .insert(removedGroupMembers)
        .values({ conversationId: groupId, userId })
        .onConflictDoNothing();
      return true;
    });
    if (!removed || !member) {
      throw new DomainException(
        ErrorCode.NOT_A_MEMBER,
        HttpStatus.NOT_FOUND,
        'That User is not a Member of this Group',
      );
    }

    const { conversation } = await this.get(callerId, groupId);
    try {
      this.realtime.push(
        RealtimeEvent.GROUP_MEMBER_REMOVED,
        conversation.members.map((m) => m.id),
        { conversationId: groupId, member },
        groupId,
      );
    } catch (error) {
      this.logger.error({ err: error, conversationId: groupId }, 'socket push failed');
    }
    return { conversation: conversation as GroupMembershipResponse['conversation'] };
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
  private async findOrCreateDirect(
    tx: Tx,
    a: string,
    b: string,
  ): Promise<{ id: string; created: boolean }> {
    const [low, high] = a < b ? [a, b] : [b, a];
    const pair = and(
      eq(directConversations.lowUserId, low),
      eq(directConversations.highUserId, high),
    );
    const [existing] = await tx
      .select({ id: directConversations.conversationId })
      .from(directConversations)
      .where(pair);
    if (existing) return { id: existing.id, created: false };

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
      return { id: created!.id, created: true };
    }
    await tx.delete(conversations).where(eq(conversations.id, created!.id));
    const [winner] = await tx
      .select({ id: directConversations.conversationId })
      .from(directConversations)
      .where(pair);
    return { id: winner!.id, created: false };
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
