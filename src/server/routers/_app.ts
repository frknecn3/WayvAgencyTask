import { router, publicProcedure } from '../trpc';
import { campaignRouter } from './campaign';

export const appRouter = router({
  healthcheck: publicProcedure.query(() => 'yay!'),
  campaign: campaignRouter,
});

export type AppRouter = typeof appRouter;
