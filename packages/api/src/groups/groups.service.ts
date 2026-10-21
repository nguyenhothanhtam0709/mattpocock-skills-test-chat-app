import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  ErrorCode,
  GROUP_MEMBERS_MAX,
  RealtimeEvent,
  type ConversationMember,
  type CreateGroupRequest,
  type CreateGroupResponse,
  type GroupMembershipResponse,
  type Message,
} from '@chat/contracts';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import type { Logger } from 'pino';
import { DomainException } from '../common/all-exceptions.filter.js';
import { PG_POOL } from '../db/database.module.js';
import {
  conversationMembers,
  conversations,
  groups,
  systemMessages,
  membershipPeriods,
  messages,
  OPEN_PERIOD_END,
  users,
} from '../db/schema.js';
import { PINO } from '../logging/logging.module.js';
import { RealtimeGateway } from '../realtime/realtime.gateway.js';
import { CommitOrder, lockConversation } from '../messages/commit-order.js';
import { ConversationQueries } from '../messages/conversation-queries.js';
import {
  conversationNotFound,
  memberRow,
  rejectIfClosed,
  requireGroup,
  requireMember,
  requireOwner,
  requireReader,
} from '../messages/conversation-rules.js';
import { MessagesService } from '../messages/messages.service.js';
import { nextSequence, only, toMessage, type Tx } from '../messages/message-rows.js';

type SystemMessageKind = Exclude<Message['kind'], 'text'>;

/** What leaving did, for the pushes that follow the commit. */
interface LeaveOutcome {
  systemMessage: Message;
  closed: boolean;
  newOwnerId: string | undefined;
}

/**
 * Group lifecycle: create, add, remove, leave. Add, remove and leave share one shape: lock the
 * Conversation, take a commit-order slot, check every rule under the lock, change membership,
 * write the System Message and the period, commit; then, in commit order, change rooms and push.
 */
@Injectable()
export class GroupsService {
  private readonly db: NodePgDatabase;

  constructor(
    @Inject(PG_POOL) pool: Pool,
    private readonly realtime: RealtimeGateway,
    private readonly commitOrder: CommitOrder,
    private readonly queries: ConversationQueries,
    private readonly messagesService: MessagesService,
    @Inject(PINO) private readonly logger: Logger,
  ) {
    this.db = drizzle(pool);
  }

  /**
   * Creates a Group owned by `ownerId`, with the Owner and the distinct initial Members as
   * Members, and pushes the new Conversation to each of them. Push is best-effort (ADR-0001).
   */
  async create(ownerId: string, request: CreateGroupRequest): Promise<CreateGroupResponse> {
    const name = request.name.trim();
    const memberIds = [...new Set([ownerId, ...request.memberIds])];
    if (memberIds.length > GROUP_MEMBERS_MAX) throw groupFull();
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
      const created = only(
        await tx
          .insert(conversations)
          .values({ kind: 'group' })
          .returning({ id: conversations.id }),
        'the new Conversation',
      );
      await tx.insert(groups).values({ conversationId: created.id, name, ownerId });
      await tx
        .insert(conversationMembers)
        .values(memberIds.map((userId) => ({ conversationId: created.id, userId })));
      await tx.insert(membershipPeriods).values(
        memberIds.map((userId) => ({
          conversationId: created.id,
          userId,
          startSequence: 0,
        })),
      );
      return created.id;
    });

    const members = (await this.queries.membersOf([id])).get(id) ?? [];
    await this.pushCreated(id, ownerId, memberIds);
    return { conversation: { id, kind: 'group', name, ownerId, members, closed: false } };
  }

  /**
   * The Owner adds a User, who is a Member at once. The Conversation row is locked so that the
   * 256-Member cap holds under concurrent adds. Pushes are best-effort (ADR-0001).
   */
  addMember(callerId: string, groupId: string, userId: string): Promise<GroupMembershipResponse> {
    return this.changeMembership(
      groupId,
      async (tx) => {
        await requireOwner(tx, callerId, groupId);
        const member = await memberRow(tx, userId);
        if (!member) {
          throw new DomainException(
            ErrorCode.USER_NOT_FOUND,
            HttpStatus.NOT_FOUND,
            'User not found',
          );
        }
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
        if (current.length >= GROUP_MEMBERS_MAX) throw groupFull();
        await tx.insert(conversationMembers).values({ conversationId: groupId, userId });
        const systemMessage = await insertSystemMessage(
          tx,
          groupId,
          callerId,
          member,
          'member_added',
        );
        // Messages up to now stay out of reach; the new period starts just before its own System Message.
        await tx.insert(membershipPeriods).values({
          conversationId: groupId,
          userId,
          startSequence: systemMessage.sequence - 1,
        });
        return { systemMessage, member };
      },
      async ({ systemMessage, member }) => {
        // The room join comes before any read that can throw, as in remove and leave.
        this.pushSafely(groupId, () => {
          this.realtime.joinGroupRoom(userId, groupId);
        });
        const response = await this.groupAs(callerId, groupId);
        try {
          const [summary] = await this.queries.summaries(userId, groupId);
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
          this.realtime.pushToGroup(RealtimeEvent.MESSAGE_CREATED, groupId, {
            message: systemMessage,
          });
        } catch (error) {
          this.logPushFailure(error, groupId);
        }
        return response;
      },
    );
  }

  /** The Owner removes a Member (never themselves). The removed User gets no more pushes. */
  removeMember(
    callerId: string,
    groupId: string,
    userId: string,
  ): Promise<GroupMembershipResponse> {
    return this.changeMembership(
      groupId,
      async (tx) => {
        await requireOwner(tx, callerId, groupId);
        if (userId === callerId) {
          throw new DomainException(
            ErrorCode.OWNER_CANNOT_BE_REMOVED,
            HttpStatus.CONFLICT,
            'The Owner cannot be removed from their Group',
          );
        }
        const member = await memberRow(tx, userId);
        const wasMember = await dropMember(tx, groupId, userId);
        if (!wasMember || !member) return undefined;
        const systemMessage = await insertSystemMessage(
          tx,
          groupId,
          callerId,
          member,
          'member_removed',
        );
        await endPeriod(tx, groupId, userId, systemMessage.sequence);
        return { removed: systemMessage, member };
      },
      async (outcome) => {
        if (!outcome) {
          throw new DomainException(
            ErrorCode.NOT_A_MEMBER,
            HttpStatus.FORBIDDEN,
            'That User is not a Member of this Group',
          );
        }
        const { removed, member } = outcome;
        // The removed User's sockets leave the room first, so they only get the ended event.
        this.pushSafely(groupId, () => {
          this.realtime.leaveGroupRoom(userId, groupId);
        });
        const response = await this.groupAs(callerId, groupId);
        this.pushSafely(groupId, () => {
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
        });
        return response;
      },
    );
  }

  /**
   * A Member leaves; their period ends at the newest Message. If they were the Owner,
   * ownership passes to the Member whose current period began first (ties: lowest User ID).
   * If they were the last Member, the Group is closed. Pushes are best-effort (ADR-0001).
   */
  leave(callerId: string, groupId: string): Promise<GroupMembershipResponse> {
    return this.changeMembership(
      groupId,
      async (tx) => {
        const group = await requireGroup(tx, groupId);
        await requireReader(tx, groupId, callerId);
        await rejectIfClosed(tx, groupId);
        await requireMember(tx, groupId, callerId, true);
        const leaver = await memberRow(tx, callerId);
        if (!leaver) throw new Error('Expected the leaving Member to exist');
        if (!(await dropMember(tx, groupId, callerId))) throw conversationNotFound();
        const systemMessage = await insertSystemMessage(
          tx,
          groupId,
          callerId,
          leaver,
          'member_left',
        );
        await endPeriod(tx, groupId, callerId, systemMessage.sequence);
        const successor = await successorOwner(tx, groupId);
        let outcome: LeaveOutcome;
        if (!successor) {
          outcome = { systemMessage, closed: true, newOwnerId: undefined };
        } else if (group.ownerId !== callerId) {
          outcome = { systemMessage, closed: false, newOwnerId: undefined };
        } else {
          await tx
            .update(groups)
            .set({ ownerId: successor })
            .where(eq(groups.conversationId, groupId));
          outcome = { systemMessage, closed: false, newOwnerId: successor };
        }
        return { leaver, outcome };
      },
      async ({ leaver, outcome }) => {
        this.pushSafely(groupId, () => {
          this.realtime.leaveGroupRoom(callerId, groupId);
        });
        const response = await this.groupAs(callerId, groupId);
        this.pushSafely(groupId, () => {
          if (outcome.closed) {
            this.realtime.push(
              RealtimeEvent.GROUP_CLOSED,
              [callerId],
              { conversationId: groupId },
              groupId,
            );
            return;
          }
          this.realtime.pushToGroup(RealtimeEvent.GROUP_MEMBER_LEFT, groupId, {
            conversationId: groupId,
            member: leaver,
          });
          this.realtime.pushToGroup(RealtimeEvent.MESSAGE_CREATED, groupId, {
            message: outcome.systemMessage,
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
        });
        return response;
      },
    );
  }

  /**
   * The shared shape of a membership change. The lock comes first, then the commit-order slot,
   * then `change` checks every rule against what is true now (so a concurrent change cannot
   * slip past it); `after` runs once every earlier change of the Group has finished its own.
   */
  private changeMembership<R>(
    groupId: string,
    change: (tx: Tx) => Promise<R>,
    after: (result: R) => Promise<GroupMembershipResponse>,
  ): Promise<GroupMembershipResponse> {
    return this.commitOrder.run(
      groupId,
      (queue) =>
        this.db.transaction(async (tx) => {
          await lockConversation(tx, groupId);
          queue();
          return change(tx);
        }),
      after,
    );
  }

  /** The Group as the caller sees it now. */
  private async groupAs(callerId: string, groupId: string): Promise<GroupMembershipResponse> {
    const { conversation } = await this.messagesService.get(callerId, groupId);
    if (conversation.kind !== 'group') throw new Error('Expected a Group conversation');
    return { conversation };
  }

  /** Pushes are best-effort (ADR-0001): a failure is logged, never surfaced. */
  private pushSafely(groupId: string, push: () => void): void {
    try {
      push();
    } catch (error) {
      this.logPushFailure(error, groupId);
    }
  }

  private logPushFailure(error: unknown, conversationId: string): void {
    this.logger.error({ err: error, conversationId }, 'socket push failed');
  }

  private async pushCreated(conversationId: string, ownerId: string, memberIds: string[]) {
    try {
      for (const userId of memberIds) this.realtime.joinGroupRoom(userId, conversationId);
      const [conversation] = await this.queries.summaries(ownerId, conversationId);
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
}

const groupFull = () =>
  new DomainException(
    ErrorCode.GROUP_FULL,
    HttpStatus.CONFLICT,
    `A Group has at most ${GROUP_MEMBERS_MAX} Members`,
  );

/** Deletes the User's current membership; false when they were not a Member. */
async function dropMember(tx: Tx, groupId: string, userId: string): Promise<boolean> {
  const deleted = await tx
    .delete(conversationMembers)
    .where(
      and(eq(conversationMembers.conversationId, groupId), eq(conversationMembers.userId, userId)),
    )
    .returning({ userId: conversationMembers.userId });
  return deleted.length > 0;
}

/** Ends the User's open period at the System Message that ended their membership. */
async function endPeriod(tx: Tx, groupId: string, userId: string, endSequence: number) {
  await tx
    .update(membershipPeriods)
    .set({ endSequence })
    .where(
      and(
        eq(membershipPeriods.conversationId, groupId),
        eq(membershipPeriods.userId, userId),
        eq(membershipPeriods.endSequence, OPEN_PERIOD_END),
      ),
    );
}

/** The Member whose open period began first (ties: lowest User ID), if any is left. */
async function successorOwner(tx: Tx, groupId: string): Promise<string | undefined> {
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
  return successor?.userId;
}

/**
 * Inserts a System Message at the next position of the Conversation's sequence, inside the
 * caller's transaction (the Conversation row must be locked). `actorId` made the change,
 * `subject` is who it is about.
 */
async function insertSystemMessage(
  tx: Tx,
  conversationId: string,
  actorId: string,
  subject: ConversationMember,
  kind: SystemMessageKind,
): Promise<Message> {
  const row = only(
    await tx
      .insert(messages)
      .values({
        conversationId,
        senderId: actorId,
        sequence: await nextSequence(tx, conversationId),
        kind,
      })
      .returning(),
    'the new System Message',
  );
  await tx.insert(systemMessages).values({ messageId: row.id, kind, subjectId: subject.id });
  return toMessage(row, subject);
}
