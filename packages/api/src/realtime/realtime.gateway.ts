import { Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import {
  WebSocketGateway,
  WebSocketServer,
  type OnGatewayConnection,
  type OnGatewayInit,
} from '@nestjs/websockets';
import { RealtimeEvent, type RealtimeEventName } from '@chat/contracts';
import type { Logger } from 'pino';
import type { IoServer as Server, IoSocket as Socket } from './socket-types.js';
import { AccessTokenAuthenticator } from '../auth/access-token-authenticator.js';
import { PG_POOL } from '../db/database.module.js';
import { conversationMembers, groups } from '../db/schema.js';
import { PINO } from '../logging/logging.module.js';

export const userRoom = (userId: string) => `user:${userId}`;
export const conversationRoom = (conversationId: string) => `conversation:${conversationId}`;
export const sessionRoom = (sessionId: string) => `session:${sessionId}`;

/**
 * Server-push only (ADR-0001): no `@SubscribeMessage` handlers exist, so anything a client
 * emits is ignored. Authentication happens once, in the handshake; a token that expires later
 * does not close the socket.
 */
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;

  private readonly db: NodePgDatabase;

  constructor(
    private readonly authenticator: AccessTokenAuthenticator,
    @Inject(PG_POOL) pool: Pool,
    @Inject(PINO) private readonly logger: Logger,
  ) {
    this.db = drizzle(pool);
  }

  afterInit(server: Server): void {
    server.use((socket, next) => {
      void this.authenticate(socket).then(next);
    });
  }

  private async authenticate(socket: Socket): Promise<Error | undefined> {
    const token: unknown = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
    const result = await this.authenticator.check(typeof token === 'string' ? token : undefined);
    if (!result.ok) {
      this.logger.warn({ socketId: socket.id, code: result.code }, 'socket auth failed');
      return new Error(result.code);
    }
    try {
      // Read in the handshake so the rooms are joined before the client sees `connect`.
      const groupRooms = await this.groupRoomsOf(result.auth.userId);
      socket.data = { userId: result.auth.userId, sessionId: result.auth.sessionId, groupRooms };
    } catch (error) {
      this.logger.error({ err: error, socketId: socket.id }, 'socket group rooms lookup failed');
      return new Error('INTERNAL');
    }
    return undefined;
  }

  /** The Group rooms of the Groups the User is a current Member of. */
  private async groupRoomsOf(userId: string): Promise<string[]> {
    const rows = await this.db
      .select({ id: conversationMembers.conversationId })
      .from(conversationMembers)
      .innerJoin(groups, eq(groups.conversationId, conversationMembers.conversationId))
      .where(eq(conversationMembers.userId, userId));
    return rows.map((row) => conversationRoom(row.id));
  }

  handleConnection(socket: Socket): void {
    const { userId, sessionId, groupRooms } = socket.data as {
      userId: string;
      sessionId: string;
      groupRooms: string[];
    };
    void socket.join([userRoom(userId), sessionRoom(sessionId), ...groupRooms]);
    this.logger.info({ socketId: socket.id, userId, sessionId }, 'socket connected');
    socket.on('disconnect', (reason) => {
      this.logger.info({ socketId: socket.id, userId, sessionId, reason }, 'socket disconnected');
    });
  }

  /** Pushes to every socket of the given Users; logs the event, User count and Conversation. */
  push(
    event: RealtimeEventName,
    userIds: string[],
    payload: unknown,
    conversationId: string,
  ): void {
    this.server.to(userIds.map(userRoom)).emit(event, payload);
    this.logger.info({ event, targetUsers: userIds.length, conversationId }, 'socket push');
  }

  /** Pushes to every socket in the Group's room, i.e. those of its current Members. */
  pushToGroup(event: RealtimeEventName, conversationId: string, payload: unknown): void {
    this.server.to(conversationRoom(conversationId)).emit(event, payload);
    this.logger.info({ event, conversationId }, 'socket push');
  }

  /** Puts every socket of the User in the Group's room (they became a Member). */
  joinGroupRoom(userId: string, conversationId: string): void {
    this.server.in(userRoom(userId)).socketsJoin(conversationRoom(conversationId));
  }

  /** Takes every socket of the User out of the Group's room (they stopped being a Member). */
  leaveGroupRoom(userId: string, conversationId: string): void {
    this.server.in(userRoom(userId)).socketsLeave(conversationRoom(conversationId));
  }

  /** Tells every socket of the session it is over, then disconnects them. Other sessions stay. */
  revokeSession(sessionId: string): void {
    const room = sessionRoom(sessionId);
    this.server.to(room).emit(RealtimeEvent.SESSION_REVOKED, {});
    this.server.in(room).disconnectSockets(true);
    this.logger.info({ event: RealtimeEvent.SESSION_REVOKED, sessionId }, 'socket session revoked');
  }
}
