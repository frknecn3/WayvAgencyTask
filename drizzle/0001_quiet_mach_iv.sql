ALTER TYPE "public"."submission_status" ADD VALUE 'paid';--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "payout_per_1k_views" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "total_budget" SET DATA TYPE integer;