import { campaigns, submissions, submissionMetrics } from '@/db/schema';
import { eq, sql, and, desc } from 'drizzle-orm';
import { computePayout } from '@/lib/payout';

// kapanyanın o anki toplam harcamasını ve izlenmesini onaylanmış submissionlar üzerinden hesaplar.
// bütçe kontrolü yaparken veritabanını kiltlediğimizde (transaction içinde) gerçek zamanlı sınırı bulmak için bunu çağırıyoruz.
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
    const rate = Number(sub.payoutPer1k);
    // burada bütçe limtine infinity geçiyoruz çünkü sadece geçmişte onaylananların toplam maliyetini topluyoruz,
    // yani bu adımda yeni bir bütçe sinırı falan uygulamıyoruz.
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
