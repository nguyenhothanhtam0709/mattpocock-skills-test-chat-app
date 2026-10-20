import { sql } from 'drizzle-orm';
import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * A registered person. Username and email are stored exactly as typed; the unique indexes
 * on their lowercased form make uniqueness case-insensitive.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
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
