import { describe, it, expect } from 'vitest';
import { db } from '@/db/index';
import { campaigns, submissions, submissionMetrics, users } from '@/db/schema';
import { computeCampaignSpend } from './campaign-spend';

describe('campaign-spend integration', () => {
  it('computes correct spend for approved submissions only', async () => {
    // Run everything in a transaction and rollback at the end to keep DB clean
    await db.transaction(async (tx) => {
      // 1. Create a user
      const [user] = await tx.insert(users).values({
        email: `test-spend-${Date.now()}@example.com`,
        role: 'creator',
      }).returning();

      // 2. Create a campaign
      const [campaign] = await tx.insert(campaigns).values({
        title: 'Test Spend Campaign',
        platforms: ['tiktok'],
        payoutPer1kViews: '500', // $5.00 (500 cents) per 1k views
        totalBudget: '100000', // $1000.00
        status: 'active',
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 86400000),
      }).returning();

      // 3. Create approved submission A
      const [subA] = await tx.insert(submissions).values({
        campaignId: campaign.id,
        creatorId: user.id,
        postUrl: `https://tiktok.com/@user/video/A-${Date.now()}`,
        platform: 'tiktok',
        status: 'approved',
      }).returning();

      // Insert metric A (1500 views -> 1k payable -> 500 cents)
      await tx.insert(submissionMetrics).values({
        submissionId: subA.id,
        views: 1500,
        likes: 100,
        comments: 10,
        capturedAt: new Date().toISOString().split('T')[0],
      });

      // 4. Create approved submission B
      const [subB] = await tx.insert(submissions).values({
        campaignId: campaign.id,
        creatorId: user.id,
        postUrl: `https://tiktok.com/@user/video/B-${Date.now()}`,
        platform: 'tiktok',
        status: 'approved',
      }).returning();

      // Insert older metric for B (should be ignored)
      await tx.insert(submissionMetrics).values({
        submissionId: subB.id,
        views: 2000,
        likes: 100,
        comments: 10,
        capturedAt: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      });
      // Insert latest metric for B (3200 views -> 3k payable -> 1500 cents)
      await tx.insert(submissionMetrics).values({
        submissionId: subB.id,
        views: 3200,
        likes: 100,
        comments: 10,
        capturedAt: new Date().toISOString().split('T')[0],
      });

      // 5. Create pending submission C (should be completely ignored by the query)
      const [subC] = await tx.insert(submissions).values({
        campaignId: campaign.id,
        creatorId: user.id,
        postUrl: `https://tiktok.com/@user/video/C-${Date.now()}`,
        platform: 'tiktok',
        status: 'pending',
      }).returning();

      await tx.insert(submissionMetrics).values({
        submissionId: subC.id,
        views: 10000,
        likes: 100,
        comments: 10,
        capturedAt: new Date().toISOString().split('T')[0],
      });

      // 6. Compute spend!
      const spend = await computeCampaignSpend(tx, campaign.id);
      
      // Expected: subA (500 cents) + subB (1500 cents) = 2000 cents total
      expect(spend).toBe(2000);

      // Rollback to keep DB clean
      tx.rollback();
    }).catch(e => {
      // Ignore the expected Drizzle rollback error
      if (!e.message.includes('Rollback')) {
        throw e;
      }
    });
  });
});
