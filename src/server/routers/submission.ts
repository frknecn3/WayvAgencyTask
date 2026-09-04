import { z } from 'zod';
import { router, creatorProcedure, adminProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { db } from '@/db/index';
import { campaigns, submissions, submissionMetrics, users } from '@/db/schema';
import { eq, sql, and, asc, desc } from 'drizzle-orm';
import { submissionCreateSchema } from '@/lib/schemas/submission';
import { computePayout } from '@/lib/payout';
import { computeCampaignSpend, getLatestMetric } from '@/lib/campaign-spend';

export const submissionRouter = router({
  create: creatorProcedure
    .input(submissionCreateSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. Verify campaign exists and is active
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, input.campaign_id))
        .limit(1);

      if (!campaign) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Campaign not found' });
      }

      if (campaign.status !== 'active') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Campaign is not active' });
      }

      // 2. Verify submission platform is one of the campaign's platforms
      if (!campaign.platforms?.includes(input.platform)) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Platform not supported by this campaign' });
      }

      // 3. Insert with status pending and catch Postgres unique violation (23505)
      try {
        const [submission] = await db
          .insert(submissions)
          .values({
            campaignId: input.campaign_id,
            creatorId: parseInt(ctx.user.id, 10),
            postUrl: input.post_url,
            platform: input.platform,
            status: 'pending',
          })
          .returning();

        return submission;
      } catch (error: any) {
        // Postgres unique violation code is 23505
        if (error.code === '23505') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'This URL has already been submitted to this campaign.',
          });
        }
        throw error; // Rethrow other unexpected errors
      }
    }),

  mySubmissions: creatorProcedure
    .query(async ({ ctx }) => {
      const creatorId = parseInt(ctx.user.id, 10);

      // Using a correlated subquery to get the latest views
      const latestViewsQuery = sql<number>`(
        SELECT views 
        FROM submission_metric 
        WHERE submission_id = ${submissions.id} 
        ORDER BY captured_at DESC 
        LIMIT 1
      )`;

      const results = await db
        .select({
          submission: submissions,
          campaign: campaigns,
          latestViews: latestViewsQuery,
        })
        .from(submissions)
        .innerJoin(campaigns, eq(submissions.campaignId, campaigns.id))
        .where(eq(submissions.creatorId, creatorId));

      return results.map(row => {
        const views = row.latestViews ?? 0;
        const ratePer1kCents = Number(row.campaign.payoutPer1kViews);
        
        // Estimate earnings using Infinity for the budget (just an estimate, not approval)
        const payoutResult = computePayout(views, ratePer1kCents, Infinity);
        const estimatedEarnings = payoutResult.ok ? payoutResult.payoutCents : 0;

        return {
          id: row.submission.id,
          postUrl: row.submission.postUrl,
          platform: row.submission.platform,
          status: row.submission.status,
          rejectionReason: row.submission.rejectionReason,
          createdAt: row.submission.createdAt,
          campaignTitle: row.campaign.title,
          latestViews: views,
          estimatedEarnings,
        };
      });
    }),

  listPending: adminProcedure
    .input(z.object({ campaign_id: z.coerce.number().int() }))
    .query(async ({ input }) => {
      const pendingSubmissions = await db
        .select({
          submission: submissions,
          creator: {
            email: users.email,
          },
        })
        .from(submissions)
        .innerJoin(users, eq(submissions.creatorId, users.id))
        .where(
          and(
            eq(submissions.campaignId, input.campaign_id),
            eq(submissions.status, 'pending')
          )
        )
        .orderBy(asc(submissions.createdAt));

      return pendingSubmissions.map(row => ({
        ...row.submission,
        creatorEmail: row.creator.email,
      }));
    }),

  // admin endpinti: içerik üreticisinin gönderisini onaylar.
  // bu kısım çok kritik çünkü para mezvusu dönüyor. kampanyanın güncel harcamasını dinamik hesaplayıp,
  // bu yeni onayın tolpam bütçeyi kesinlikle aşmayacağından emin oluyoruz.
  approve: adminProcedure
    .input(z.object({ submission_id: z.coerce.number().int(), campaign_id: z.coerce.number().int() }))
    .mutation(async ({ input }) => {
      return await db.transaction(async (tx) => {
        // 1. kampanya satırnı kilitliyoruz.
        // select for update ile satırı fizksel olarak kilitliyoruz ki aynı anda gelen onay istekleri sıraya girsin.
        // bylece aynı anda iki admin onay verirse bütçenin eksiye düşmesi (race condition) gibi saçmalıkları engelliyoruz.
        const [campaign] = await tx
          .select()
          .from(campaigns)
          .where(eq(campaigns.id, input.campaign_id))
          .for('update');

        if (!campaign || campaign.status !== 'active') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Campaign not active' });
        }

        // 2. Compute current spend across ALL approved submissions
        const { spend: currentSpend } = await computeCampaignSpend(tx, campaign.id);
        const totalBudget = Number(campaign.totalBudget);
        const remainingBudget = totalBudget - currentSpend;

        // 3. Get the latest metric for THIS submission
        const latestMetric = await getLatestMetric(tx, input.submission_id);
        const views = latestMetric?.views ?? 0;

        // 4. payut fonksiyonunu çağırıp bütçe kontrolü yapıyoruz.
        // bu izlenmerin maliyeti kalan bütçeye uyuyor mu diye net bir hesap yapıyoruz.
        const ratePer1k = Number(campaign.payoutPer1kViews);
        const result = computePayout(views, ratePer1k, remainingBudget);

        if (!result.ok) {
          // eger ok false dönerse, bu gönderinin maliyeti kalan bütçeyi matamatiksel olarak aşıyor demektir, direkt reddediyoruz.
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Approval would exceed campaign budget',
          });
        }

        // 5. Approve the submission
        const [submission] = await tx.update(submissions)
          .set({ status: 'approved' })
          .where(eq(submissions.id, input.submission_id))
          .returning();

        if (!submission) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' });
        }

        // 6. Auto-complete if budget exhausted
        if (result.exhaustsBudget) {
          await tx.update(campaigns)
            .set({ status: 'completed' })
            .where(eq(campaigns.id, campaign.id));
        }
        
        return submission;
      });
    }),

  reject: adminProcedure
    .input(z.object({ submission_id: z.coerce.number().int(), reason: z.string().min(1, "Reason is required") }))
    .mutation(async ({ input }) => {
      const [submission] = await db
        .update(submissions)
        .set({ status: 'rejected', rejectionReason: input.reason })
        .where(eq(submissions.id, input.submission_id))
        .returning();
        
      if (!submission) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Submission not found' });
      }
      return submission;
    }),
});
