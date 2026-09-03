import { router, creatorProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { db } from '@/db/index';
import { campaigns, submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { submissionCreateSchema } from '@/lib/schemas/submission';

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
});
