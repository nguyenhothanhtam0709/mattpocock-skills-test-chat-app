import { describe, expect, it } from 'vitest';
import {
  ConversationSummarySchema,
  GetMessagesQuerySchema,
  UNREAD_COUNT_MAX,
  MessageBodySchema,
  SendDirectMessageRequestSchema,
  SendMessageRequestSchema,
} from './message.js';

const id = '0198a2b4-7c3e-7a52-9f31-5d2f4c1e8b60';

describe('MessageBodySchema', () => {
  it.each([
    ['plain text', 'hello'],
    ['angle brackets', '<b>hi</b> a < b > c'],
    ['newlines and tabs', 'one\ntwo\r\n\tthree'],
    ['surrounding whitespace, kept as typed', '  hi  \n'],
    ['exactly 4000 characters', 'a'.repeat(4000)],
    ['4000 astral characters', '😀'.repeat(4000)],
  ])('accepts %s unchanged', (_name, body) => {
    expect(MessageBodySchema.parse(body)).toBe(body);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', ' \n\t  '],
    ['4001 characters', 'a'.repeat(4001)],
    ['NUL', 'a\u0000b'],
    ['a C0 control character', 'a\u0007b'],
    ['a C1 control character', 'a\u0085b'],
  ])('rejects %s', (_name, body) => {
    expect(MessageBodySchema.safeParse(body).success).toBe(false);
  });
});

describe('send requests', () => {
  it('requires a UUID client message ID, and a recipient ID for a direct send', () => {
    const direct = { recipientId: id, clientMessageId: id, body: 'x' };
    expect(SendDirectMessageRequestSchema.safeParse(direct).success).toBe(true);
    expect(
      SendDirectMessageRequestSchema.safeParse({ ...direct, clientMessageId: 'nope' }).success,
    ).toBe(false);
    expect(SendMessageRequestSchema.safeParse({ clientMessageId: id, body: 'x' }).success).toBe(
      true,
    );
    expect(SendMessageRequestSchema.safeParse({ body: 'x' }).success).toBe(false);
  });
});

describe('GetMessagesQuerySchema', () => {
  it('defaults the limit to 10 and coerces query strings', () => {
    expect(GetMessagesQuerySchema.parse({})).toEqual({ limit: 10 });
    expect(GetMessagesQuerySchema.parse({ limit: '25', before: '7' })).toEqual({
      limit: 25,
      before: 7,
    });
  });

  it.each([
    { limit: '0' },
    { limit: '101' },
    { limit: 'x' },
    { before: '0' },
    { before: '-1' },
    { after: '0' },
    { before: '2147483648' },
    { before: '1', after: '2' },
  ])('rejects %j', (query) => {
    expect(GetMessagesQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('ConversationSummarySchema', () => {
  const summary = {
    id,
    kind: 'direct',
    name: 'Bob',
    members: [],
    isMember: true,
    closed: false,
    lastMessage: null,
  };

  it('carries an Unread Count from 0 up to the cap of 100', () => {
    expect(UNREAD_COUNT_MAX).toBe(100);
    for (const unreadCount of [0, 1, 100]) {
      expect(ConversationSummarySchema.parse({ ...summary, unreadCount }).unreadCount).toBe(
        unreadCount,
      );
    }
  });

  it.each([[-1], [101], [1.5], [undefined]])('rejects an Unread Count of %j', (unreadCount) => {
    expect(ConversationSummarySchema.safeParse({ ...summary, unreadCount }).success).toBe(false);
  });
});
