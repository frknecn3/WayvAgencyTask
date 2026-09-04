import 'dotenv/config';
import { db, client } from '../src/db/index';
import { submissions, submissionMetrics } from '../src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

function mockFetchMetrics(
  postUrl: string, 
  prevViews: number, 
  prevLikes: number, 
  prevComments: number
) {
  // Random increment 100-5000 views
  const viewInc = Math.floor(Math.random() * 4901) + 100;
  // Likes ~10% of views, comments ~1% of views roughly
  const likeInc = Math.floor(viewInc * (Math.random() * 0.15 + 0.05));
  const commentInc = Math.floor(viewInc * (Math.random() * 0.02 + 0.005));
  
  return {
    views: prevViews + viewInc,
    likes: prevLikes + likeInc,
    comments: prevComments + commentInc
  };
}

async function main() {
  console.log('🚀 Starting metric ingestion process...');

  const approvedSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.status, 'approved'));

  console.log(`Found ${approvedSubmissions.length} approved submissions to process.`);

  // Use today's date formatted as YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  for (const sub of approvedSubmissions) {
    // Get latest metric to feed to the mock
    const [latest] = await db
      .select()
      .from(submissionMetrics)
      .where(eq(submissionMetrics.submissionId, sub.id))
      .orderBy(desc(submissionMetrics.capturedAt))
      .limit(1);

    const prevViews = latest?.views ?? 0;
    const prevLikes = latest?.likes ?? 0;
    const prevComments = latest?.comments ?? 0;

    const { views, likes, comments } = mockFetchMetrics(sub.postUrl, prevViews, prevLikes, prevComments);

    console.log(`[ID: ${sub.id}] Fetched: ${views} views (+${views - prevViews}) from ${sub.platform}`);

    // Upsert the metric using GREATEST to ensure metrics never decrease
    await db.insert(submissionMetrics)
      .values({ 
        submissionId: sub.id, 
        capturedAt: today, 
        views, 
        likes, 
        comments 
      })
      .onConflictDoUpdate({
        target: [submissionMetrics.submissionId, submissionMetrics.capturedAt],
        set: {
          views: sql`GREATEST(${submissionMetrics.views}, ${views})`,
          likes: sql`GREATEST(${submissionMetrics.likes}, ${likes})`,
          comments: sql`GREATEST(${submissionMetrics.comments}, ${comments})`,
        },
      });
  }

  console.log('✅ Ingestion complete.');
  
  await client.end();
}

main().catch((err) => {
  console.error('❌ Ingestion failed:', err);
  process.exit(1);
});
