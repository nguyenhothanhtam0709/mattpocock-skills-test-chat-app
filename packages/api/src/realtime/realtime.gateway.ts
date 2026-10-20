import { Inject } from '@nestjs/common';
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
import { PINO } from '../logging/logging.module.js';

export const userRoom = (userId: string) => `user:${userId}`;
export const sessionRoom = (sessionId: string) => `session:${sessionId}`;

/**
 * Server-push only (ADR-0001): no `@SubscribeMessage` handlers exist, so anything a client
 * emits is ignored. Authentication happens once, in the handshake; a token that expires later
 * does not close the socket.
 */
@WebSocketGateway()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly authenticator: AccessTokenAuthenticator,
    @Inject(PINO) private readonly logger: Logger,
  ) {}

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
    socket.data = { userId: result.auth.userId, sessionId: result.auth.sessionId };
    return undefined;
  }

  handleConnection(socket: Socket): void {
    const { userId, sessionId } = socket.data as { userId: string; sessionId: string };
    void socket.join([userRoom(userId), sessionRoom(sessionId)]);
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

  /** Tells every socket of the session it is over, then disconnects them. Other sessions stay. */
  revokeSession(sessionId: string): void {
    const room = sessionRoom(sessionId);
    this.server.to(room).emit(RealtimeEvent.SESSION_REVOKED, {});
    this.server.in(room).disconnectSockets(true);
    this.logger.info({ event: RealtimeEvent.SESSION_REVOKED, sessionId }, 'socket session revoked');
  }
}
