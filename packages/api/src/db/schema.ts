import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * A registered person. Username and email are stored exactly as typed; the unique indexes
 * on their lowercased form make uniqueness case-insensitive.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    nickname: text('nickname'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_username_lower_unique').on(sql`lower(${t.username})`),
    uniqueIndex('users_email_lower_unique').on(sql`lower(${t.email})`),
  ],
);

/**
 * A signed-in device. The refresh token is an opaque random value; only its SHA-256 hash is
 * stored, and the hash is replaced on every rotation.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash').notNull(),
    /** The hash before the last rotation; presenting it again means the token was stolen. */
    previousRefreshTokenHash: text('previous_refresh_token_hash'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('sessions_refresh_token_hash_unique').on(t.refreshTokenHash),
    index('sessions_previous_refresh_token_hash_idx').on(t.previousRefreshTokenHash),
  ],
);

/**
 * Access-token IDs (`jti`) that must stop working before they expire (logout). Entries are
 * only useful until `expiresAt`, after which they are swept.
 */
export const tokenDenyList = pgTable('token_deny_list', {
  jti: text('jti').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

/** A container of Messages: a Direct Conversation or a Group. */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    kind: text('kind').notNull(),
    /** Sequence of the newest Message; bumped under the row lock when a Message is inserted. */
    lastSequence: integer('last_sequence').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('conversations_kind_check', sql`${t.kind} in ('direct', 'group')`)],
);

export const conversationMembers = pgTable(
  'conversation_members',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index('conversation_members_user_idx').on(t.userId),
  ],
);

/**
 * The normalized pair (lower ID first) of a Direct Conversation. The unique index is what
 * guarantees at most one Direct Conversation per pair, even under concurrent first sends.
 */
export const directConversations = pgTable(
  'direct_conversations',
  {
    conversationId: uuid('conversation_id')
      .primaryKey()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    lowUserId: uuid('low_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    highUserId: uuid('high_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [
    uniqueIndex('direct_conversations_pair_unique').on(t.lowUserId, t.highUserId),
    check('direct_conversations_ordered_check', sql`${t.lowUserId} < ${t.highUserId}`),
  ],
);

/** The name and the single Owner of a Group. */
export const groups = pgTable('groups', {
  conversationId: uuid('conversation_id')
    .primaryKey()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

/** The `endSequence` of a period that has not ended: the largest `integer` value. */
export const OPEN_PERIOD_END = 2147483647;

/**
 * A stretch of a User's membership in a Conversation: they can read the Messages whose
 * sequence is greater than `startSequence` and at most `endSequence`. A User gets one period
 * per time they were a Member, so a Former Member who was added back has several. An open
 * period has `endSequence = OPEN_PERIOD_END` (a sentinel rather than a nullable column,
 * ADR-0005); a User has at most one open period per Conversation.
 */
export const membershipPeriods = pgTable(
  'membership_periods',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startSequence: integer('start_sequence').notNull(),
    endSequence: integer('end_sequence').notNull().default(OPEN_PERIOD_END),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('membership_periods_conversation_user_idx').on(t.conversationId, t.userId),
    index('membership_periods_user_idx').on(t.userId),
    uniqueIndex('membership_periods_open_unique')
      .on(t.conversationId, t.userId)
      .where(sql`${t.endSequence} = ${sql.raw(String(OPEN_PERIOD_END))}`),
    check('membership_periods_range_check', sql`${t.endSequence} >= ${t.startSequence}`),
  ],
);

/** Immutable once inserted. */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`uuidv7()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    clientMessageId: uuid('client_message_id').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('messages_conversation_sequence_unique').on(t.conversationId, t.sequence),
    uniqueIndex('messages_sender_client_message_id_unique').on(t.senderId, t.clientMessageId),
  ],
);
