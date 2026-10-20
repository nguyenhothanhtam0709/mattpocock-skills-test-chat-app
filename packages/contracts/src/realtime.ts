import { z } from 'zod';
import { ConversationSummarySchema, MessageSchema } from './message.js';

/** Server-to-client Socket.IO events. The socket is push-only (ADR-0001). */
export const RealtimeEvent = {
  MESSAGE_CREATED: 'message.created',
  CONVERSATION_CREATED: 'conversation.created',
  SESSION_REVOKED: 'session.revoked',
} as const;

export type RealtimeEventName = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

/** Pushed to every Member's User room, the sender's included, after the Message is saved. */
export const MessageCreatedEventSchema = z.object({ message: MessageSchema });

export type MessageCreatedEvent = z.infer<typeof MessageCreatedEventSchema>;

/** Pushed to the recipient of a new Direct Conversation, shaped as in their Conversation list. */
export const ConversationCreatedEventSchema = z.object({ conversation: ConversationSummarySchema });

export type ConversationCreatedEvent = z.infer<typeof ConversationCreatedEventSchema>;

/** Pushed to every socket of a session that was ended (logout); the server then disconnects them. */
export const SessionRevokedEventSchema = z.object({});

export const RealtimeEventSchemas = {
  [RealtimeEvent.MESSAGE_CREATED]: MessageCreatedEventSchema,
  [RealtimeEvent.CONVERSATION_CREATED]: ConversationCreatedEventSchema,
  [RealtimeEvent.SESSION_REVOKED]: SessionRevokedEventSchema,
} as const;
