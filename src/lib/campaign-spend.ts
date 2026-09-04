import { campaigns, submissions, submissionMetrics } from '@/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { computePayout } from '@/lib/payout';

// calculates the current total spend and views of the campaign based on approved submissions
// we call this to find the real-time limit when we lock the database (inside a transaction) for budget control
export async function computeCampaignSpend(tx: any, campaignId: number): Promise<{ spend: number; views: number }> {
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
  let totalViews = 0;
  for (const sub of approvedSubmissions) {
    const views = sub.latestViews ?? 0;
    totalViews += views;
    const rate = sub.payoutPer1k;
    // we pass infinity to the budget limit here because we are only summing the total cost of past approved submissions,
    // so we aren't applying any new budget limits at this step
    const payoutResult = computePayout(views, rate, Infinity);
    if (payoutResult.ok) {
      currentSpend += payoutResult.payoutCents;
    }
  }
  return { spend: currentSpend, views: totalViews };
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
