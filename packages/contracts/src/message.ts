import { z } from 'zod';
import { UserSearchResultSchema } from './user.js';

export const MESSAGE_BODY_MAX = 4000;

/** NUL, C0 and C1 control characters, except newline, carriage return and tab. */
const isForbiddenControl = (cp: number): boolean =>
  (cp <= 0x1f && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d) || (cp >= 0x7f && cp <= 0x9f);

/**
 * Plain text, 1-4000 characters (counted as characters, not UTF-16 units), not blank after
 * trimming. Parsed value is the input exactly: never trimmed, never HTML-touched (ADR-0002).
 */
export const MessageBodySchema = z.string().refine(
  (value) => {
    const chars = [...value];
    return (
      chars.length <= MESSAGE_BODY_MAX &&
      value.trim() !== '' &&
      !chars.some((char) => isForbiddenControl(char.codePointAt(0)!))
    );
  },
  { message: `must be 1-${MESSAGE_BODY_MAX} characters of text, not blank` },
);

/** Chosen by the sender so that resending the same Message never duplicates it. */
export const ClientMessageIdSchema = z.uuid();

export const SendMessageRequestSchema = z.object({
  clientMessageId: ClientMessageIdSchema,
  body: MessageBodySchema,
});

export type SendMessageRequest = z.input<typeof SendMessageRequestSchema>;

export const SendDirectMessageRequestSchema = SendMessageRequestSchema.extend({
  recipientId: z.uuid(),
});

export type SendDirectMessageRequest = z.input<typeof SendDirectMessageRequestSchema>;

export const MessageSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  senderId: z.uuid(),
  sequence: z.number().int().positive(),
  clientMessageId: z.uuid(),
  body: z.string(),
  createdAt: z.iso.datetime(),
});

export type Message = z.infer<typeof MessageSchema>;

export const ConversationSchema = z.object({
  id: z.uuid(),
  kind: z.literal('direct'),
  memberIds: z.array(z.uuid()),
});

export type Conversation = z.infer<typeof ConversationSchema>;

export const SendDirectMessageResponseSchema = z.object({
  message: MessageSchema,
  conversation: ConversationSchema,
});

export type SendDirectMessageResponse = z.infer<typeof SendDirectMessageResponseSchema>;

export const SendMessageResponseSchema = z.object({ message: MessageSchema });

export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;

/** Sequence numbers are Postgres `integer`s. */
const SEQUENCE_MAX = 2_147_483_647;
const SequenceCursorSchema = z.coerce.number().int().positive().max(SEQUENCE_MAX);

/**
 * `GET /conversations/:id/messages`. `before=<sequence>` returns older Messages newest first;
 * `after=<sequence>` returns newer Messages oldest first (to fill a gap). Not both.
 */
export const GetMessagesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(10),
    before: SequenceCursorSchema.optional(),
    after: SequenceCursorSchema.optional(),
  })
  .refine((q) => q.before === undefined || q.after === undefined, {
    message: 'before and after cannot be combined',
  });

export type GetMessagesQuery = z.infer<typeof GetMessagesQuerySchema>;

export const GetMessagesResponseSchema = z.object({
  messages: z.array(MessageSchema),
  hasMore: z.boolean(),
});

export type GetMessagesResponse = z.infer<typeof GetMessagesResponseSchema>;

/** A Member as other Members see them: never an email. */
export const ConversationMemberSchema = UserSearchResultSchema;

export type ConversationMember = z.infer<typeof ConversationMemberSchema>;

/** A Group with its Members and its single Owner. */
export const GroupSchema = z.object({
  id: z.uuid(),
  kind: z.literal('group'),
  name: z.string(),
  ownerId: z.uuid(),
  members: z.array(ConversationMemberSchema),
});

export type Group = z.infer<typeof GroupSchema>;

/** `GET /conversations/:id` */
export const GetConversationResponseSchema = z.object({
  conversation: z.discriminatedUnion('kind', [
    z.object({
      id: z.uuid(),
      kind: z.literal('direct'),
      members: z.array(ConversationMemberSchema),
    }),
    GroupSchema,
  ]),
});

export type GetConversationResponse = z.infer<typeof GetConversationResponseSchema>;

export const LAST_MESSAGE_PREVIEW_MAX = 100;

export const ConversationSummarySchema = z.object({
  id: z.uuid(),
  kind: z.enum(['direct', 'group']),
  /** For a Direct Conversation: the other User's Nickname, else their Username. */
  name: z.string(),
  members: z.array(ConversationMemberSchema),
  /** Null until the first Message (a new Group has none). */
  lastMessage: z
    .object({
      senderId: z.uuid(),
      /** Whitespace collapsed, at most 100 characters. */
      preview: z.string().max(LAST_MESSAGE_PREVIEW_MAX),
      createdAt: z.iso.datetime(),
    })
    .nullable(),
});

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>;

/** `GET /conversations`: the caller's Conversations, most recently active first. */
export const ListConversationsResponseSchema = z.object({
  conversations: z.array(ConversationSummarySchema),
});

export type ListConversationsResponse = z.infer<typeof ListConversationsResponseSchema>;
