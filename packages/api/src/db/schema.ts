import { sql } from 'drizzle-orm';
import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

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
