import { pgTable, text } from 'drizzle-orm/pg-core';

/** Placeholder key/value table that proves the migration workflow; real tables arrive with features. */
export const appMeta = pgTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
