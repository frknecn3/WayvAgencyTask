import { describe, it, expect } from 'vitest';
import { db } from '@/db/index';
import { campaigns, submissions, users } from '@/db/schema';
import { submissionRouter } from './submission';
import { t } from '../trpc';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

const createCaller = t.createCallerFactory(submissionRouter);

describe('submission router - access control', () => {
  it('Creator A calls submission.mySubmissions and sees only their own submissions', async () => {
    const timestamp = Date.now();

    // seed two creators
    const [creatorA] = await db.insert(users).values({
      email: `creator-A-${timestamp}@example.com`,
      role: 'creator',
    }).returning();

    const [creatorB] = await db.insert(users).values({
      email: `creator-B-${timestamp}@example.com`,
      role: 'creator',
    }).returning();

    // seed a campaign
    const [campaign] = await db.insert(campaigns).values({
      title: 'Access Control Campaign',
      platforms: ['tiktok'],
      payoutPer1kViews: 100,
      totalBudget: 1000,
      status: 'active',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86400000),
    }).returning();

    // seed submission for creator a
    await db.insert(submissions).values({
      campaignId: campaign.id,
      creatorId: creatorA.id,
      postUrl: `https://tiktok.com/@usera/video/1-${timestamp}`,
      platform: 'tiktok',
      status: 'pending',
    });

    // seed submission for creator b
    await db.insert(submissions).values({
      campaignId: campaign.id,
      creatorId: creatorB.id,
      postUrl: `https://tiktok.com/@userb/video/2-${timestamp}`,
      platform: 'tiktok',
      status: 'pending',
    });

    // create caller for creator a
    const callerA = createCaller({
      user: { id: creatorA.id.toString(), email: creatorA.email, role: 'creator' }
    });

    // call mysubmissions
    const result = await callerA.mySubmissions();

    // assert isolation
    expect(result.length).toBe(1);
    expect(result[0].postUrl).toContain('@usera');

    // clean up
    await db.delete(submissions).where(eq(submissions.campaignId, campaign.id));
    await db.delete(campaigns).where(eq(campaigns.id, campaign.id));
    await db.delete(users).where(eq(users.id, creatorA.id));
    await db.delete(users).where(eq(users.id, creatorB.id));
  });

  it('Creator calls an adminProcedure -> gets FORBIDDEN', async () => {
    const caller = createCaller({
      user: { id: '999', email: 'creator@example.com', role: 'creator' }
    });

    await expect(caller.listPending({ campaign_id: 1 })).rejects.toThrowError(
      new TRPCError({ code: 'FORBIDDEN' })
    );
  });

  it('Unauthenticated call to protectedProcedure -> gets UNAUTHORIZED', async () => {
    // unauthenticated context (user is null)
    const caller = createCaller({
      user: null
    });

    await expect(caller.mySubmissions()).rejects.toThrowError(
      new TRPCError({ code: 'UNAUTHORIZED' })
    );
  });

  it('Creator tries to call submission.approve -> gets FORBIDDEN', async () => {
    const caller = createCaller({
      user: { id: '999', email: 'creator@example.com', role: 'creator' }
    });

    await expect(caller.approve({ submission_id: 1, campaign_id: 1 })).rejects.toThrowError(
      new TRPCError({ code: 'FORBIDDEN' })
    );
  });
});
