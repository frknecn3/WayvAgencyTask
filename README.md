# Wayv Agency Task - Engineering Notes

## Setup
Getting this running on a fresh machine is pretty straightforward:
1. Make sure you have Docker, Node.js, and npm (or pnpm) installed.
2. Spin up the local Postgres database with `docker-compose up -d`.
3. Copy `.env.example` to `.env.local` (just make sure `DATABASE_URL` matches the docker credentials).
4. Run `npm install` to grab the dependencies.
5. Push the schema with `npm run db:push`, then populate some initial data with `npm run seed`.
6. Start up the dev server with `npm run dev`.
7. You can run the test suite with `npm run test` and manually test the metric ingest script via `npm run ingest`.

## Turkish Comments
You might notice a few Turkish comments sprinkled around the codebase. I usually do this when I'm working on solo projects because it just makes it a bit easier and faster for me to organize my thoughts while developing. 

## Concurrent Approvals
Handling the campaign budget cap concurrently was definitely the trickiest part of the backend. I went with a strict Drizzle transaction using an explicit `SELECT ... FOR UPDATE` row lock on the `campaigns` table. 

I chose this locking approach over a simple atomic update (like `UPDATE ... WHERE remaining_budget >= cost`) because the "remaining budget" isn't actually a hardcoded column in the database—it's a computed aggregate of all the approved submissions for that specific campaign. So, I had to physically lock the campaign row, calculate the total spend snapshot across all previously approved submissions right then and there, check if the *new* submission would push us over the budget, and if everything looks good, authorize it. 

I thought about using advisory locks or pessimistic table locks at first, but locking at the row level with `FOR UPDATE` gives us bulletproof budget protection under high concurrency without accidentally blocking reads or updates to totally unrelated campaigns. The Vitest `Promise.allSettled` integration test I wrote proves this holds up under load.

## What I Skipped
Since I was short on time, I intentionally skipped a few things I'd normally include for production:
- **Real URL Validation:** Right now we accept basically any string as a post URL. Normally, I'd parse the URL and ping an oEmbed API to make sure the video actually exists and matches the platform.
- **Optimistic UI:** When approving or rejecting submissions, the frontend just relies on TRPC invalidating the cache to fetch fresh data. I didn't bother wiring up optimistic UI updates.
- **Cursor Pagination:** The campaign list just uses standard offset/limit pagination. If this scales up, I'd definitely swap that for cursor-based pagination so deep pages don't slow down the database.
- **Real Auth:** To keep review velocity high, I just rolled a custom lightweight `jose` JWT with a dropdown User Switcher instead of dealing with NextAuth or a full OAuth provider setup.

## If I Had Another Day
If I had more time, the very first thing I'd add is a **Notification Service for Budget Exhaustion**. Right now, when a campaign fills up, it just quietly flips to `completed`. We really should fire off a Slack webhook or transactional email to the Admin so they know the campaign hit its cap. 

I'd also pull the core approval transaction out of the TRPC router and into its own dedicated `CampaignBudgetService` class to make it easier to trigger from background cron jobs or external APIs.

## AI Usage
I used Claude/GPT mainly to scaffold out the boilerplate React code and handle the tedious frontend styling. The shadcn UI components look awesome, but wiring them up into nice grids and charts takes a while, so I leaned heavily on the AI to generate the Recharts `<AreaChart>` and the basic Tailwind CSS layouts for the Admin Dashboard. 

That being said, I wrote all of the core backend logic, transaction boundaries, database schemas, and money/budget calculations entirely by myself. The AI struggled to properly wrap its head around the `SELECT FOR UPDATE` locking mechanism needed for dynamic spend bounds without causing deadlocks, so I stepped in and wrote the TRPC mutations, Drizzle transactions, and Vitest concurrency tests by hand to make sure the financial data integrity was rock solid.
