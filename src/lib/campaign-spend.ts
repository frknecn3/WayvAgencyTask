import { campaigns, submissions, submissionMetrics } from '@/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { computePayout } from '@/lib/payout';

export async function computeCampaignSpend(tx: any, campaignId: number): Promise<number> {
  const approvedSubmissions = await tx
    .select({
      id: submissions.id,
      latestViews: sql<number>`(
        SELECT views 
        FROM submission_metric 
        WHERE submission_id = ${submissions.id} 
        ORDER BY captured_at DESC 
        LIMIT 1
      )`,
      payoutPer1k: campaigns.payoutPer1kViews,
    })
    .from(submissions)
    .innerJoin(campaigns, eq(submissions.campaignId, campaigns.id))
    .where(
      and(
        eq(submissions.campaignId, campaignId),
        eq(submissions.status, 'approved')
      )
    );

  let currentSpend = 0;
  for (const sub of approvedSubmissions) {
    const views = sub.latestViews ?? 0;
    const rate = Number(sub.payoutPer1k);
    const payoutResult = computePayout(views, rate, Infinity);
    if (payoutResult.ok) {
      currentSpend += payoutResult.payoutCents;
    }
  }
  return currentSpend;
}

export async function getLatestMetric(tx: any, submissionId: number) {
  const [metric] = await tx
    .select({ views: submissionMetrics.views })
    .from(submissionMetrics)
    .where(eq(submissionMetrics.submissionId, submissionId))
    .orderBy(desc(submissionMetrics.capturedAt))
    .limit(1);
  return metric;
}
