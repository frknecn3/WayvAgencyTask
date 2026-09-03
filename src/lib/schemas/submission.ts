import { z } from 'zod';
import { platformEnum } from './campaign';

export const submissionCreateSchema = z
  .object({
    // coerce.number() kullandık çünkü campaigns.id dbde integer olarak tutuluyor UUID degil.
    campaign_id: z.coerce.number().int().positive('Valid Campaign ID is required'),
    post_url: z.string().url('Must be a valid URL'),
    platform: platformEnum,
  })
  .refine(
    (data) => {
      const url = data.post_url;
      if (data.platform === 'tiktok') {
        return /tiktok\.com\/@[^/]+\/video\/\d+/i.test(url);
      }
      if (data.platform === 'instagram') {
        return /instagram\.com\/(?:reel|p)\/[^/?]+/i.test(url);
      }
      if (data.platform === 'youtube') {
        return /(?:youtube\.com\/shorts\/[^/?]+|youtu\.be\/[^/?]+)/i.test(url);
      }
      return false;
    },
    {
      message: 'Post URL does not match the expected format for the selected platform',
      path: ['post_url'],
    }
  );

export type SubmissionCreateInput = z.infer<typeof submissionCreateSchema>;
