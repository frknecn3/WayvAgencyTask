import 'dotenv/config';
import { db, client } from '../src/db/index';
import { users, campaigns } from '../src/db/schema';

async function main() {
  console.log('Seeding database...');

  // Seed Users idempotently
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

  // Check if campaigns already exist to make it idempotent
  const existingCampaigns = await db.select().from(campaigns).limit(1);
  
  if (existingCampaigns.length === 0) {
    const now = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await db.insert(campaigns).values([
      {
        title: 'Summer Skincare Launch',
        platforms: ['tiktok', 'instagram'],
        payoutPer1kViews: '15.00',
        totalBudget: '10000.00',
        status: 'active',
        startsAt: now,
        endsAt: nextMonth,
      },
      {
        title: 'Winter Cozy Vibes',
        platforms: ['youtube'],
        payoutPer1kViews: '20.00',
        totalBudget: '5000.00',
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
