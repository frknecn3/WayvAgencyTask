import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '@/db/index';
import { campaigns, submissions, submissionMetrics, users } from '@/db/schema';
import { runIngest } from './ingest';
import { eq, inArray } from 'drizzle-orm';

describe('Ingest Script Integration Tests', () => {
  let testCampaignId: number;
  let subA: number;
  let subB: number;

  beforeEach(async () => {
    // setup initial data for each test manually without transaction
    const timestamp = Date.now();
    
    // seed user
    const [user] = await db.insert(users).values({
      email: `ingest-test-${timestamp}@example.com`,
      role: 'creator',
    }).returning();

    // seed campaign
    const [campaign] = await db.insert(campaigns).values({
      title: 'Ingest Test Campaign',
      platforms: ['tiktok'],
      payoutPer1kViews: 100,
      totalBudget: 1000,
      status: 'active',
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 86400000),
    }).returning();
    testCampaignId = campaign.id;

    // seed 2 approved submissions
    const [s1] = await db.insert(submissions).values({
      campaignId: campaign.id,
      creatorId: user.id,
      postUrl: `https://tiktok.com/@user/video/A-${timestamp}`,
      platform: 'tiktok',
      status: 'approved',
    }).returning();
    subA = s1.id;

    const [s2] = await db.insert(submissions).values({
      campaignId: campaign.id,
      creatorId: user.id,
      postUrl: `https://tiktok.com/@user/video/B-${timestamp}`,
      platform: 'tiktok',
      status: 'approved',
    }).returning();
    subB = s2.id;
    
    process.env.SIMULATE_FAILURE = '0';
    process.env.SIMULATE_LOWER_VIEWS = '0';
  });

  afterEach(async () => {
    await db.delete(submissionMetrics).where(inArray(submissionMetrics.submissionId, [subA, subB]));
    await db.delete(submissions).where(eq(submissions.campaignId, testCampaignId));
    await db.delete(campaigns).where(eq(campaigns.id, testCampaignId));
  });

  it('idempotency: running ingest twice does not duplicate rows and increases metrics', async () => {
    // run 1
    await runIngest();
    
    const run1Metrics = await db.select().from(submissionMetrics).where(eq(submissionMetrics.submissionId, subA));
    expect(run1Metrics.length).toBe(1);
    const run1Views = run1Metrics[0].views;
    
    // run 2
    await runIngest();
    
    const run2Metrics = await db.select().from(submissionMetrics).where(eq(submissionMetrics.submissionId, subA));
    expect(run2Metrics.length).toBe(1); // No duplicate rows created!
    expect(run2Metrics[0].views).toBeGreaterThan(run1Views); // Views went up
  });

  it('views only go up: mock returning lower views preserves the greatest value', async () => {
    // run 1 normally
    await runIngest();
    
    // update db directly to set a high value
    await db.update(submissionMetrics)
      .set({ views: 1000000 })
      .where(eq(submissionMetrics.submissionId, subA));

    // run 2 with mock returning lower views
    process.env.SIMULATE_LOWER_VIEWS = '1';
    await runIngest();
    
    const metrics = await db.select().from(submissionMetrics).where(eq(submissionMetrics.submissionId, subA));
    
    // views should not have decreased
    expect(metrics[0].views).toBe(1000000); 
  });

  it('fault isolation: one failure does not stop others and is reported', async () => {
    // force the ingest loop to throw on index 0
    process.env.SIMULATE_FAILURE = '1';
    
    const { results, failures } = await runIngest();
    
    // exactly 1 failure reported
    expect(failures.length).toBe(1);
    
    // other submissions succeeded
    const successes = results.filter(r => r.status === 'fulfilled');
    expect(successes.length).toBeGreaterThan(0);
    
    // verify in db that at least one of our test submissions got written
    // (If subA was index 0, it failed, but subB should succeed. If a global sub was index 0, both subA and subB succeed)
    const testMetrics = await db.select().from(submissionMetrics).where(inArray(submissionMetrics.submissionId, [subA, subB]));
    
    // at least one succeeded
    expect(testMetrics.length).toBeGreaterThanOrEqual(1);
  });
});
