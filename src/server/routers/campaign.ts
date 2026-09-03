import { z } from 'zod';
import { router, adminProcedure } from '../trpc';
import { db } from '@/db/index';
import { campaigns } from '@/db/schema';
import { eq, ilike, and, count } from 'drizzle-orm';
import { statusEnum } from '@/lib/schemas/campaign';

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
});
