import 'dotenv/config';
import { db, client } from '../src/db/index';
import { users, campaigns } from '../src/db/schema';

async function main() {
  console.log('Seeding database...');

  // seed users idempotently
  await db.insert(users).values([
    {
      email: 'admin@example.com',
      role: 'admin',
    },
    {
      email: 'creator@example.com',
      role: 'creator',
    },
  ]).onConflictDoNothing({ target: users.email });

  console.log('Users seeded.');

  // check if campaigns already exist to make it idempotent
  const existingCampaigns = await db.select().from(campaigns).limit(1);
  
  if (existingCampaigns.length === 0) {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await db.insert(campaigns).values([
      {
        title: 'Summer Skincare Launch',
        platforms: ['tiktok', 'instagram'],
        payoutPer1kViews: 250,
        totalBudget: 100000,
        status: 'active',
        startsAt: now,
        endsAt: nextMonth,
      },
      {
        title: 'Winter Cozy Vibes',
        platforms: ['youtube'],
        payoutPer1kViews: 300,
        totalBudget: 50000,
        status: 'draft',
        startsAt: nextMonth,
        endsAt: nextMonth,
      },
    ]);
    console.log('Campaigns seeded.');
  } else {
    console.log('Campaigns already exist, skipping.');
  }

  console.log('Seeding finished.');
  
  await client.end();
}

main().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
