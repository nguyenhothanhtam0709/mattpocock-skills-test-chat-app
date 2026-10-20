import { z } from 'zod';
import { ConversationMemberSchema, ConversationSummarySchema, MessageSchema } from './message.js';

/** Server-to-client Socket.IO events. The socket is push-only (ADR-0001). */
export const RealtimeEvent = {
  MESSAGE_CREATED: 'message.created',
  CONVERSATION_CREATED: 'conversation.created',
  GROUP_MEMBER_ADDED: 'group.member_added',
  GROUP_MEMBER_REMOVED: 'group.member_removed',
  SESSION_REVOKED: 'session.revoked',
} as const;

export type RealtimeEventName = (typeof RealtimeEvent)[keyof typeof RealtimeEvent];

/** Pushed to every Member's User room, the sender's included, after the Message is saved. */
export const MessageCreatedEventSchema = z.object({ message: MessageSchema });

export type MessageCreatedEvent = z.infer<typeof MessageCreatedEventSchema>;

/** Pushed to the recipient of a new Direct Conversation, shaped as in their Conversation list. */
export const ConversationCreatedEventSchema = z.object({ conversation: ConversationSummarySchema });

export type ConversationCreatedEvent = z.infer<typeof ConversationCreatedEventSchema>;

/** Pushed to every current Member of a Group (the added User included) when a User is added. */
export const GroupMemberAddedEventSchema = z.object({
  conversationId: z.uuid(),
  member: ConversationMemberSchema,
});

export type GroupMemberAddedEvent = z.infer<typeof GroupMemberAddedEventSchema>;

/** Pushed to the remaining Members of a Group when the Owner removes a Member. */
export const GroupMemberRemovedEventSchema = z.object({
  conversationId: z.uuid(),
  member: ConversationMemberSchema,
});

export type GroupMemberRemovedEvent = z.infer<typeof GroupMemberRemovedEventSchema>;

/** Pushed to every socket of a session that was ended (logout); the server then disconnects them. */
export const SessionRevokedEventSchema = z.object({});

export const RealtimeEventSchemas = {
  [RealtimeEvent.MESSAGE_CREATED]: MessageCreatedEventSchema,
  [RealtimeEvent.CONVERSATION_CREATED]: ConversationCreatedEventSchema,
  [RealtimeEvent.GROUP_MEMBER_ADDED]: GroupMemberAddedEventSchema,
  [RealtimeEvent.GROUP_MEMBER_REMOVED]: GroupMemberRemovedEventSchema,
  [RealtimeEvent.SESSION_REVOKED]: SessionRevokedEventSchema,
} as const;
