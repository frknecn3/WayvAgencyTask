import { z } from 'zod';

export const platformEnum = z.enum(['tiktok', 'instagram', 'youtube']);
export const statusEnum = z.enum(['draft', 'active', 'paused', 'completed']);

const baseCampaignSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  platforms: z.array(platformEnum).min(1, 'At least one platform must be selected'),
  payout_per_1k_views: z.number().int().min(1, 'Payout must be at least 1'),
  total_budget: z.number().int().min(100, 'Total budget must be at least 100'),
  status: statusEnum.default('draft'),
  starts_at: z.coerce.date(),
  ends_at: z.coerce.date(),
});

export const campaignCreateSchema = baseCampaignSchema.refine(
  (data) => data.ends_at > data.starts_at,
  {
    message: 'End date must be after the start date',
    path: ['ends_at'],
  }
);

export const campaignUpdateSchema = baseCampaignSchema.partial().refine(
  (data) => {
    if (data.starts_at && data.ends_at) {
      return data.ends_at > data.starts_at;
    }
    return true;
  },
  {
    message: 'End date must be after the start date',
    path: ['ends_at'],
  }
);

export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type CampaignUpdateInput = z.infer<typeof campaignUpdateSchema>;
