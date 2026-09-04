import { pgTable, serial, text, timestamp, pgEnum, integer, numeric, date, unique, index } from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['admin', 'creator']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed']);
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'approved', 'rejected', 'paid']);

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
  payoutPer1kViews: integer('payout_per_1k_views').notNull(),
  totalBudget: integer('total_budget').notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  startsAt: timestamp('starts_at').notNull(),
  endsAt: timestamp('ends_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id').references(() => campaigns.id).notNull(),
  creatorId: integer('creator_id').references(() => users.id).notNull(),
  postUrl: text('post_url').notNull(),
  platform: text('platform').notNull(),
  status: submissionStatusEnum('status').default('pending').notNull(),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  unique('campaign_post_url_unq').on(table.campaignId, table.postUrl),
  index('campaign_status_idx').on(table.campaignId, table.status)
]);

export const submissionMetrics = pgTable('submission_metric', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id').references(() => submissions.id).notNull(),
  capturedAt: date('captured_at').notNull(),
  views: integer('views').notNull(),
  likes: integer('likes').notNull(),
  comments: integer('comments').notNull(),
}, (table) => [
  unique('submission_metric_unq').on(table.submissionId, table.capturedAt)
]);

export type SubmissionMetric = typeof submissionMetrics.$inferSelect;
export type NewSubmissionMetric = typeof submissionMetrics.$inferInsert;
