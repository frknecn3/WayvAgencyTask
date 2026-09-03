import { pgTable, serial, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'creator']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('creator').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
