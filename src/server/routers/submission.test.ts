import { describe, it, expect } from 'vitest';
import { db } from '@/db/index';
import { campaigns, submissions, submissionMetrics, users } from '@/db/schema';
import { submissionRouter } from './submission';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

describe('submission router - concurrent approvals', () => {
  it('prevents budget overdraw on concurrent approve calls using SELECT FOR UPDATE', async () => {
    // 1. Setup unique test data for the integration test
    const timestamp = Date.now();
    
    const [admin] = await db.insert(users).values({
      email: `admin-${timestamp}@example.com`,
      role: 'admin',
    }).returning();

    const [creator] = await db.insert(users).values({
      email: `creator-${timestamp}@example.com`,
      role: 'creator',
    }).returning();

    const [campaign] = await db.insert(campaigns).values({
      title: 'Concurrency Test Campaign',
      platforms: ['tiktok'],
      payoutPer1kViews: '300', // $3.00 (300 cents) per 1k views
      totalBudget: '301',      // Enough for 1 approval, but leaves 1 cent so it doesn't auto-complete
      status: 'active',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86400000),
    }).returning();

    // Already approved submission A (spending 0 so far, since it has 0 views)
    const [subA] = await db.insert(submissions).values({
      campaignId: campaign.id,
      creatorId: creator.id,
      postUrl: `https://tiktok.com/@user/video/A-${timestamp}`,
      platform: 'tiktok',
      status: 'approved',
    }).returning();

    // Pending submission B (will request 300 cents, exhausting the exact budget)
    const [subB] = await db.insert(submissions).values({
      campaignId: campaign.id,
      creatorId: creator.id,
      postUrl: `https://tiktok.com/@user/video/B-${timestamp}`,
      platform: 'tiktok',
      status: 'pending',
    }).returning();
    
    // Add 1000 views to subB (1000 views at $3/1k = 300 cents)
    await db.insert(submissionMetrics).values({
      submissionId: subB.id,
      views: 1000,
      likes: 0,
      comments: 0,
      capturedAt: new Date().toISOString().split('T')[0],
    });

    // 2. Create a TRPC caller as an admin
    const caller = submissionRouter.createCaller({
      user: { id: admin.id.toString(), email: admin.email, role: 'admin' }
    });

    // 3. Fire two identical approve calls simultaneously
    // Both will try to approve subB. Because of SELECT FOR UPDATE, one will win the lock,
    // approve it, and compute current spend as 0. The second will wait for the lock,
    // wake up, re-compute the spend (which is now 300 since subB is already approved),
    // and correctly realize that there's no budget left for the action, throwing an error.
    const results = await Promise.allSettled([
      caller.approve({ submission_id: subB.id, campaign_id: campaign.id }),
      caller.approve({ submission_id: subB.id, campaign_id: campaign.id }),
    ]);

    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // Exactly one should succeed
    expect(fulfilled.length).toBe(1);
    // Exactly one should fail
    expect(rejected.length).toBe(1);

    // The failure should be specifically due to our budget guardrails
    const rejectedReason = (rejected[0] as PromiseRejectedResult).reason as TRPCError;
    expect(rejectedReason.code).toBe('PRECONDITION_FAILED');

    // Verify the campaign state is strictly correct (did not auto-complete because 1 cent is left)
    const [updatedCampaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaign.id));
    expect(updatedCampaign.status).toBe('active');

    // 4. Clean up
    await db.delete(submissionMetrics).where(eq(submissionMetrics.submissionId, subB.id));
    await db.delete(submissions).where(eq(submissions.campaignId, campaign.id));
    await db.delete(campaigns).where(eq(campaigns.id, campaign.id));
    await db.delete(users).where(eq(users.id, admin.id));
    await db.delete(users).where(eq(users.id, creator.id));
  });
});
