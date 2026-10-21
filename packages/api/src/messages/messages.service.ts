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
import { and, asc, desc, eq, exists, gt, inArray, lt, lte, sql } from 'drizzle-orm';
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
  membershipNotes,
  membershipPeriods,
  messages,
  OPEN_PERIOD_END,
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

type NoteKind = Exclude<Message['kind'], 'text'>;

const toMessage = (row: MessageRow, subject?: ConversationMember | null): Message => ({
  id: row.id,
  conversationId: row.conversationId,
  senderId: row.senderId,
  sequence: row.sequence,
  clientMessageId: row.clientMessageId,
  kind: row.kind as Message['kind'],
  body: row.body,
  ...(subject ? { subject } : {}),
  createdAt: row.createdAt.toISOString(),
});

const conversationNotFound = () =>
  new DomainException(
    ErrorCode.CONVERSATION_NOT_FOUND,
    HttpStatus.NOT_FOUND,
    'Conversation not found',
  );

/** `get` is typed for any Conversation; the Group routes know theirs is a Group. */
const asGroup = (conversation: GetConversationResponse['conversation']) =>
  conversation as GroupMembershipResponse['conversation'];

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
    await this.requireReader(conversationId, userId);
    const forward = after !== undefined;
    const rows = await this.db
      .select({
        message: messages,
        subjectId: users.id,
        subjectUsername: users.username,
        subjectNickname: users.nickname,
      })
      .from(messages)
      .leftJoin(membershipNotes, eq(membershipNotes.messageId, messages.id))
      .leftJoin(users, eq(users.id, membershipNotes.subjectId))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          exists(
            this.db
              .select({ one: sql`1` })
              .from(membershipPeriods)
              .where(
                and(
                  eq(membershipPeriods.conversationId, messages.conversationId),
                  eq(membershipPeriods.userId, userId),
                  gt(messages.sequence, membershipPeriods.startSequence),
                  lte(messages.sequence, membershipPeriods.endSequence),
                ),
              ),
          ),
          before === undefined ? undefined : lt(messages.sequence, before),
          forward ? gt(messages.sequence, after) : undefined,
        ),
      )
      .orderBy(forward ? asc(messages.sequence) : desc(messages.sequence))
      .limit(limit + 1);
    return {
      messages: rows
        .slice(0, limit)
        .map((r) =>
          toMessage(
            r.message,
            r.subjectId === null
              ? null
              : { id: r.subjectId, username: r.subjectUsername!, nickname: r.subjectNickname },
          ),
        ),
      hasMore: rows.length > limit,
    };
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
      const [group] = await this.db
        .select({ id: groups.conversationId })
        .from(groups)
        .where(eq(groups.conversationId, message.conversationId));
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
      if (group) {
        this.realtime.pushToGroup(RealtimeEvent.MESSAGE_CREATED, message.conversationId, {
          message,
        });
        return;
      }
      this.realtime.push(
        RealtimeEvent.MESSAGE_CREATED,
        members.map((m) => m.userId),
        { message },
        message.conversationId,
      );
    } catch (error) {
      this.logPushFailure(error, message.conversationId);
    }
  }

  private async summaries(
    userId: string,
    onlyConversationId?: string,
  ): Promise<ConversationSummary[]> {
    // The newest Message inside one of the caller's membership periods (Former Members must
    // not see a preview of anything said after they left).
    const lastVisibleSequence = sql`(
      select max(vm.sequence) from messages vm
      join membership_periods vp on vp.conversation_id = vm.conversation_id
      where vm.conversation_id = ${conversations.id} and vp.user_id = ${userId}
        and vm.kind = 'text'
        and vm.sequence > vp.start_sequence and vm.sequence <= vp.end_sequence
    )`;
    const rows = await this.db
      .select({
        id: conversations.id,
        isMember: sql<boolean>`exists (
          select 1 from conversation_members cm
          where cm.conversation_id = ${conversations.id} and cm.user_id = ${userId}
        )`,
        kind: conversations.kind,
        groupName: groups.name,
        senderId: messages.senderId,
        preview: sql<
          string | null
        >`left(regexp_replace(trim(${messages.body}), '\\s+', ' ', 'g'), ${LAST_MESSAGE_PREVIEW_MAX})`,
        createdAt: messages.createdAt,
      })
      .from(conversations)
      .leftJoin(groups, eq(groups.conversationId, conversations.id))
      .leftJoin(
        messages,
        and(
          eq(messages.conversationId, conversations.id),
          eq(messages.sequence, lastVisibleSequence),
        ),
      )
      .where(
        and(
          exists(
            this.db
              .select({ one: sql`1` })
              .from(membershipPeriods)
              .where(
                and(
                  eq(membershipPeriods.conversationId, conversations.id),
                  eq(membershipPeriods.userId, userId),
                ),
              ),
          ),
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
        isMember: row.isMember,
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
    await this.requireReader(conversationId, userId);
    const members = (await this.membersOf([conversationId])).get(conversationId) ?? [];
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
      await tx.insert(membershipPeriods).values(
        memberIds.map((userId) => ({
          conversationId: created!.id,
          userId,
          startSequence: 0,
        })),
      );
      return created!.id;
    });

    const members = (await this.membersOf([id])).get(id)!;
    await this.pushGroupCreated(id, memberIds);
    return { conversation: { id, kind: 'group', name, ownerId, members } };
  }

  /** Serialises membership changes and Message sends on one Conversation. */
  private async lockConversation(
    tx: Pick<NodePgDatabase, 'execute'>,
    conversationId: string,
  ): Promise<void> {
    await tx.execute(
      sql`select 1 from ${conversations} where ${conversations.id} = ${conversationId} for update`,
    );
  }

  /** Pushes are best-effort (ADR-0001): a failure is logged, never surfaced. */
  private logPushFailure(error: unknown, conversationId: string): void {
    this.logger.error({ err: error, conversationId }, 'socket push failed');
  }

  private async pushGroupCreated(conversationId: string, memberIds: string[]) {
    try {
      for (const userId of memberIds) this.realtime.joinGroupRoom(userId, conversationId);
      const [conversation] = await this.summaries(memberIds[0]!, conversationId);
      this.realtime.push(
        RealtimeEvent.CONVERSATION_CREATED,
        memberIds,
        { conversation },
        conversationId,
      );
    } catch (error) {
      this.logPushFailure(error, conversationId);
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

  /** Anyone with a membership period, current or past, may read; else 404 (never a Member). */
  private async requireReader(conversationId: string, userId: string): Promise<void> {
    const [period] = await this.db
      .select({ id: membershipPeriods.id })
      .from(membershipPeriods)
      .where(
        and(
          eq(membershipPeriods.conversationId, conversationId),
          eq(membershipPeriods.userId, userId),
        ),
      )
      .limit(1);
    if (!period) throw conversationNotFound();
  }

  /**
   * With `forPosting`, a Former Member is told so (`NOT_A_MEMBER`); otherwise, and for a
   * never-Member, the Conversation is not found.
   */
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
      await this.requireReader(conversationId, userId);
      await this.rejectIfClosed(conversationId);
      throw new DomainException(
        ErrorCode.NOT_A_MEMBER,
        HttpStatus.FORBIDDEN,
        'You are no longer a Member of this Group',
      );
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
    await this.requireReader(groupId, callerId);
    await this.rejectIfClosed(groupId);
    await this.requireMember(groupId, callerId);
    if (group.ownerId !== callerId) {
      throw new DomainException(
        ErrorCode.NOT_GROUP_OWNER,
        HttpStatus.FORBIDDEN,
        'Only the Owner can change the Members',
      );
    }
  }

  /** A Group with no Members left is a Closed Group: read-only, for ever. */
  private async rejectIfClosed(conversationId: string): Promise<void> {
    const [member] = await this.db
      .select({ userId: conversationMembers.userId })
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId))
      .limit(1);
    if (!member) {
      throw new DomainException(
        ErrorCode.GROUP_CLOSED,
        HttpStatus.CONFLICT,
        'This Group is closed',
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
    const note = await this.db.transaction(async (tx) => {
      await this.lockConversation(tx, groupId);
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
      const note = await this.insertNote(tx, groupId, callerId, member, 'member_added');
      // Messages up to now stay out of reach; the new period starts just before its own note.
      await tx.insert(membershipPeriods).values({
        conversationId: groupId,
        userId,
        startSequence: note.sequence - 1,
      });
      return note;
    });

    const { conversation } = await this.get(callerId, groupId);
    try {
      this.realtime.joinGroupRoom(userId, groupId);
      const [summary] = await this.summaries(userId, groupId);
      this.realtime.push(
        RealtimeEvent.CONVERSATION_CREATED,
        [userId],
        { conversation: summary },
        groupId,
      );
      this.realtime.pushToGroup(RealtimeEvent.GROUP_MEMBER_ADDED, groupId, {
        conversationId: groupId,
        member,
      });
      this.realtime.pushToGroup(RealtimeEvent.MESSAGE_CREATED, groupId, { message: note });
    } catch (error) {
      this.logPushFailure(error, groupId);
    }
    return { conversation: asGroup(conversation) };
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
        ErrorCode.OWNER_CANNOT_BE_REMOVED,
        HttpStatus.CONFLICT,
        'The Owner cannot be removed from their Group',
      );
    }
    const member = await this.memberRow(userId);
    const removed = await this.db.transaction(async (tx) => {
      // Lock the Conversation so the period ends exactly at the newest Message.
      await this.lockConversation(tx, groupId);
      const deleted = await tx
        .delete(conversationMembers)
        .where(
          and(
            eq(conversationMembers.conversationId, groupId),
            eq(conversationMembers.userId, userId),
          ),
        )
        .returning({ userId: conversationMembers.userId });
      if (deleted.length === 0 || !member) return undefined;
      const note = await this.insertNote(tx, groupId, callerId, member, 'member_removed');
      await tx
        .update(membershipPeriods)
        .set({ endSequence: note.sequence })
        .where(
          and(
            eq(membershipPeriods.conversationId, groupId),
            eq(membershipPeriods.userId, userId),
            eq(membershipPeriods.endSequence, OPEN_PERIOD_END),
          ),
        );
      return note;
    });
    if (!removed || !member) {
      throw new DomainException(
        ErrorCode.NOT_A_MEMBER,
        HttpStatus.FORBIDDEN,
        'That User is not a Member of this Group',
      );
    }

    // The removed User's sockets leave the room first, so they only get the ended event.
    try {
      this.realtime.leaveGroupRoom(userId, groupId);
    } catch (error) {
      this.logPushFailure(error, groupId);
    }
    const { conversation } = await this.get(callerId, groupId);
    try {
      this.realtime.pushToGroup(RealtimeEvent.GROUP_MEMBER_REMOVED, groupId, {
        conversationId: groupId,
        member,
      });
      this.realtime.pushToGroup(RealtimeEvent.MESSAGE_CREATED, groupId, { message: removed });
      this.realtime.push(
        RealtimeEvent.GROUP_MEMBERSHIP_ENDED,
        [userId],
        { conversationId: groupId },
        groupId,
      );
    } catch (error) {
      this.logPushFailure(error, groupId);
    }
    return { conversation: asGroup(conversation) };
  }

  /**
   * A Member leaves; their period ends at the newest Message. If they were the Owner,
   * ownership passes to the Member whose current period began first (ties: lowest User ID).
   * If they were the last Member, the Group is closed. Pushes are best-effort (ADR-0001).
   */
  async leaveGroup(callerId: string, groupId: string): Promise<GroupMembershipResponse> {
    const [group] = await this.db
      .select({ ownerId: groups.ownerId })
      .from(groups)
      .where(eq(groups.conversationId, groupId));
    if (!group) throw conversationNotFound();
    await this.requireReader(groupId, callerId);
    await this.rejectIfClosed(groupId);
    await this.requireMember(groupId, callerId, true);

    const leaver = (await this.memberRow(callerId))!;
    const outcome = await this.db.transaction(async (tx) => {
      await this.lockConversation(tx, groupId);
      const deleted = await tx
        .delete(conversationMembers)
        .where(
          and(
            eq(conversationMembers.conversationId, groupId),
            eq(conversationMembers.userId, callerId),
          ),
        )
        .returning({ userId: conversationMembers.userId });
      if (deleted.length === 0) return undefined;
      const note = await this.insertNote(tx, groupId, callerId, leaver, 'member_left');
      await tx
        .update(membershipPeriods)
        .set({ endSequence: note.sequence })
        .where(
          and(
            eq(membershipPeriods.conversationId, groupId),
            eq(membershipPeriods.userId, callerId),
            eq(membershipPeriods.endSequence, OPEN_PERIOD_END),
          ),
        );
      const [current] = await tx
        .select({ ownerId: groups.ownerId })
        .from(groups)
        .where(eq(groups.conversationId, groupId));
      const [successor] = await tx
        .select({ userId: membershipPeriods.userId })
        .from(membershipPeriods)
        .where(
          and(
            eq(membershipPeriods.conversationId, groupId),
            eq(membershipPeriods.endSequence, OPEN_PERIOD_END),
          ),
        )
        .orderBy(asc(membershipPeriods.createdAt), asc(membershipPeriods.userId))
        .limit(1);
      if (!successor) return { note, closed: true as const, newOwnerId: undefined };
      if (current!.ownerId !== callerId) {
        return { note, closed: false as const, newOwnerId: undefined };
      }
      await tx
        .update(groups)
        .set({ ownerId: successor.userId })
        .where(eq(groups.conversationId, groupId));
      return { note, closed: false as const, newOwnerId: successor.userId };
    });
    if (!outcome) {
      throw new DomainException(
        ErrorCode.NOT_A_MEMBER,
        HttpStatus.FORBIDDEN,
        'You are no longer a Member of this Group',
      );
    }

    try {
      this.realtime.leaveGroupRoom(callerId, groupId);
    } catch (error) {
      this.logPushFailure(error, groupId);
    }
    const { conversation } = await this.get(callerId, groupId);
    try {
      if (outcome.closed) {
        this.realtime.push(
          RealtimeEvent.GROUP_CLOSED,
          [callerId],
          { conversationId: groupId },
          groupId,
        );
      } else {
        this.realtime.pushToGroup(RealtimeEvent.GROUP_MEMBER_LEFT, groupId, {
          conversationId: groupId,
          member: leaver,
        });
        this.realtime.pushToGroup(RealtimeEvent.MESSAGE_CREATED, groupId, {
          message: outcome.note,
        });
        if (outcome.newOwnerId) {
          this.realtime.pushToGroup(RealtimeEvent.GROUP_OWNER_CHANGED, groupId, {
            conversationId: groupId,
            ownerId: outcome.newOwnerId,
          });
        }
        this.realtime.push(
          RealtimeEvent.GROUP_MEMBERSHIP_ENDED,
          [callerId],
          { conversationId: groupId },
          groupId,
        );
      }
    } catch (error) {
      this.logPushFailure(error, groupId);
    }
    return { conversation: asGroup(conversation) };
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
      await tx.insert(membershipPeriods).values([
        { conversationId: created!.id, userId: low, startSequence: 0 },
        { conversationId: created!.id, userId: high, startSequence: 0 },
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
   * Inserts a membership note at the next position of the Conversation's sequence, inside the
   * caller's transaction (the Conversation row must be locked). `actorId` made the change,
   * `subject` is who it is about.
   */
  private async insertNote(
    tx: Tx,
    conversationId: string,
    actorId: string,
    subject: ConversationMember,
    kind: NoteKind,
  ): Promise<Message> {
    const [counter] = await tx
      .update(conversations)
      .set({ lastSequence: sql`${conversations.lastSequence} + 1` })
      .where(eq(conversations.id, conversationId))
      .returning({ sequence: conversations.lastSequence });
    const [row] = await tx
      .insert(messages)
      .values({ conversationId, senderId: actorId, sequence: counter!.sequence, kind })
      .returning();
    await tx.insert(membershipNotes).values({ messageId: row!.id, subjectId: subject.id });
    return toMessage(row!, subject);
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
