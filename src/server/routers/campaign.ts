import { z } from 'zod';
import { router, adminProcedure, creatorProcedure } from '../trpc';
import { db } from '@/db/index';
import { campaigns } from '@/db/schema';
import { eq, ilike, and, count, sql } from 'drizzle-orm';
import { statusEnum, campaignCreateSchema, campaignUpdateSchema } from '@/lib/schemas/campaign';
import { computeCampaignSpend } from '@/lib/campaign-spend';
import { TRPCError } from '@trpc/server';

export const campaignRouter = router({
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(10),
        search: z.string().optional(),
        status: statusEnum.optional(),
      })
    )
    .query(async ({ input }) => {
      const { page, pageSize, search, status } = input;

      const filters = [];
      if (search) {
        filters.push(ilike(campaigns.title, `%${search}%`));
      }
      if (status) {
        filters.push(eq(campaigns.status, status));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const items = await db
        .select()
        .from(campaigns)
        .where(whereClause)
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const [countResult] = await db
        .select({ value: count() })
        .from(campaigns)
        .where(whereClause);

      return {
        items,
        total: countResult.value,
      };
    }),

  listActive: creatorProcedure
    .query(async () => {
      const items = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.status, 'active'));
      return items;
    }),

  get: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.id))
        .limit(1);
        
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }
      
      return campaign;
    }),

  getForCreator: creatorProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(
          and(
            eq(campaigns.id, input.id),
            eq(campaigns.status, 'active')
          )
        )
        .limit(1);
        
      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Active campaign not found' });
      }
      
      return campaign;
    }),

  create: adminProcedure
    .input(campaignCreateSchema)
    .mutation(async ({ input }) => {
      const [newCampaign] = await db
        .insert(campaigns)
        .values({
          title: input.title,
          platforms: input.platforms,
          payoutPer1kViews: input.payout_per_1k_views.toString(),
          totalBudget: input.total_budget.toString(),
          status: input.status,
          startsAt: input.starts_at,
          endsAt: input.ends_at,
        })
        .returning();
        
      return newCampaign;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number().int(),
        data: campaignUpdateSchema,
      })
    )
    .mutation(async ({ input }) => {
      const updateData: Partial<typeof campaigns.$inferInsert> = {};
      
      if (input.data.title !== undefined) updateData.title = input.data.title;
      if (input.data.platforms !== undefined) updateData.platforms = input.data.platforms;
      if (input.data.payout_per_1k_views !== undefined) updateData.payoutPer1kViews = input.data.payout_per_1k_views.toString();
      if (input.data.total_budget !== undefined) updateData.totalBudget = input.data.total_budget.toString();
      if (input.data.status !== undefined) updateData.status = input.data.status;
      if (input.data.starts_at !== undefined) updateData.startsAt = input.data.starts_at;
      if (input.data.ends_at !== undefined) updateData.endsAt = input.data.ends_at;

      const [updatedCampaign] = await db
        .update(campaigns)
        .set(updateData)
        .where(eq(campaigns.id, input.id))
        .returning();

      if (!updatedCampaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      return updatedCampaign;
    }),

  stats: adminProcedure
    .input(z.object({ campaign_id: z.coerce.number().int() }))
    .query(async ({ input }) => {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.campaign_id))
        .limit(1);

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      const { spend: budgetSpent, views: totalApprovedViews } = await computeCampaignSpend(db, campaign.id);
      const totalBudget = Number(campaign.totalBudget);
      const budgetLeft = totalBudget - budgetSpent;

      return {
        totalApprovedViews,
        budgetSpent,
        budgetLeft,
      };
    }),

  dailyViews: adminProcedure
    .input(z.object({ campaign_id: z.coerce.number().int() }))
    .query(async ({ input }) => {
      const results = await db.execute(sql`
        SELECT d.date::date::text as date, COALESCE(SUM(sm.views), 0)::int as views
        FROM generate_series(
          (SELECT starts_at FROM campaigns WHERE id = ${input.campaign_id}),
          (SELECT ends_at FROM campaigns WHERE id = ${input.campaign_id}),
          '1 day'::interval
        ) AS d(date)
        LEFT JOIN submissions s ON s.campaign_id = ${input.campaign_id} AND s.status = 'approved'
        LEFT JOIN submission_metric sm ON sm.submission_id = s.id AND sm.captured_at = d.date::date
        GROUP BY d.date
        ORDER BY d.date;
      `);
      
      return results as unknown as { date: string, views: number }[];
    }),
});
