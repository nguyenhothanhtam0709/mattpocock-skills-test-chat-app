import { describe, expect, it } from 'vitest';
import {
  ConversationCreatedEventSchema,
  GroupMemberAddedEventSchema,
  GroupMemberRemovedEventSchema,
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
      GROUP_MEMBER_ADDED: 'group.member_added',
      GROUP_MEMBER_REMOVED: 'group.member_removed',
      GROUP_MEMBER_LEFT: 'group.member_left',
      GROUP_OWNER_CHANGED: 'group.owner_changed',
      GROUP_CLOSED: 'group.closed',
      SESSION_REVOKED: 'session.revoked',
    });
    expect(Object.keys(RealtimeEventSchemas).sort()).toEqual([
      'conversation.created',
      'group.closed',
      'group.member_added',
      'group.member_left',
      'group.member_removed',
      'group.owner_changed',
      'message.created',
      'session.revoked',
    ]);
  });

  it('group.member_added and group.member_removed carry the Group and the Member', () => {
    const member = { id, username: 'Bob', nickname: null };
    for (const schema of [GroupMemberAddedEventSchema, GroupMemberRemovedEventSchema]) {
      expect(schema.safeParse({ conversationId: id, member }).success).toBe(true);
      expect(schema.safeParse({ conversationId: id }).success).toBe(false);
      expect(schema.safeParse({ member }).success).toBe(false);
    }
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
      isMember: true,
      lastMessage: { senderId: id, preview: 'hi', createdAt: message.createdAt },
    };
    expect(ConversationCreatedEventSchema.safeParse({ conversation }).success).toBe(true);
    expect(ConversationCreatedEventSchema.safeParse({ conversation: { id } }).success).toBe(false);
  });

  it('session.revoked carries nothing', () => {
    expect(SessionRevokedEventSchema.safeParse({}).success).toBe(true);
  });
});
