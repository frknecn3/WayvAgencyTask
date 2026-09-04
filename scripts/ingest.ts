import 'dotenv/config';
import { db, client } from '../src/db/index';
import { submissions, submissionMetrics } from '../src/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

function mockFetchMetrics(
  submissionId: number,
  postUrl: string, 
  prevViews: number, 
  prevLikes: number, 
  prevComments: number
) {
  if (process.env.SIMULATE_FAILURE === '1' && submissionId === 4) { // Hardcoding 4 or checking a condition
    // For general testing we will just fail on the first call if env var is set
    throw new Error(`Simulated failure fetching metrics for ${postUrl}`);
  }

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

  const promises = approvedSubmissions.map(async (sub, index) => {
    // Determine which ID to fail if simulating, use the first submission's ID
    const shouldFail = process.env.SIMULATE_FAILURE === '1' && index === 0;

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

    if (shouldFail) {
      throw new Error(`Simulated fetch timeout for ${sub.postUrl}`);
    }

    const { views, likes, comments } = mockFetchMetrics(sub.id, sub.postUrl, prevViews, prevLikes, prevComments);

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
  });

  const results = await Promise.allSettled(promises);
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  
  if (failures.length > 0) {
    console.error(`\nIngest completed with ${failures.length} failure(s):`);
    failures.forEach((f, i) => console.error(`  ${i + 1}. ${f.reason}`));
    process.exitCode = 1;
  } else {
    console.log(`\nIngest completed successfully. ${results.length} submissions processed.`);
  }
  
  await client.end();
}

main().catch((err) => {
  console.error('❌ Ingestion failed:', err);
  process.exit(1);
});
