import { describe, expect, it } from 'vitest';
import {
  ConversationCreatedEventSchema,
  SessionRevokedEventSchema,
  MessageCreatedEventSchema,
  RealtimeEvent,
  RealtimeEventSchemas,
} from './realtime.js';

const id = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60';
const message = {
  id,
  conversationId: id,
  senderId: id,
  sequence: 1,
  clientMessageId: id,
  body: 'hi',
  createdAt: '2030-01-01T00:00:00.000Z',
};

describe('realtime event contracts', () => {
  it('names the server-push events', () => {
    expect(RealtimeEvent).toEqual({
      MESSAGE_CREATED: 'message.created',
      CONVERSATION_CREATED: 'conversation.created',
      SESSION_REVOKED: 'session.revoked',
    });
    expect(Object.keys(RealtimeEventSchemas).sort()).toEqual([
      'conversation.created',
      'message.created',
      'session.revoked',
    ]);
  });

  it('message.created carries the Message', () => {
    expect(MessageCreatedEventSchema.safeParse({ message }).success).toBe(true);
    expect(
      MessageCreatedEventSchema.safeParse({ message: { ...message, sequence: 0 } }).success,
    ).toBe(false);
    expect(MessageCreatedEventSchema.safeParse({}).success).toBe(false);
  });

  it('conversation.created carries the Conversation as the recipient sees it in the list', () => {
    const conversation = {
      id,
      kind: 'direct',
      name: 'Alice',
      members: [{ id, username: 'Alice', nickname: null }],
      lastMessage: { senderId: id, preview: 'hi', createdAt: message.createdAt },
    };
    expect(ConversationCreatedEventSchema.safeParse({ conversation }).success).toBe(true);
    expect(ConversationCreatedEventSchema.safeParse({ conversation: { id } }).success).toBe(false);
  });

  it('session.revoked carries nothing', () => {
    expect(SessionRevokedEventSchema.safeParse({}).success).toBe(true);
  });
});
