import { pgTable, serial, text, timestamp, pgEnum, integer, numeric } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'creator']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  role: userRoleEnum('role').default('creator').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  platforms: text('platforms').array().notNull(),
  payoutPer1kViews: numeric('payout_per_1k_views', { precision: 10, scale: 2 }).notNull(),
  totalBudget: numeric('total_budget', { precision: 10, scale: 2 }).notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
