import { router, publicProcedure } from '../trpc';
import { campaignRouter } from './campaign';
import { submissionRouter } from './submission';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'yay!'),
  campaign: campaignRouter,
  submission: submissionRouter,
});

export type AppRouter = typeof appRouter;
