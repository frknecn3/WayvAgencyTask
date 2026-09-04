'use client';

import { trpc } from '@/trpc/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CreatorDashboardPage() {
  const { data: campaigns, isLoading } = trpc.campaign.listActive.useQuery();

  return (
    <div className="container mx-auto py-10 max-w-5xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Campaigns</h1>
          <p className="text-muted-foreground mt-1">Browse available campaigns and submit your clips to earn payouts.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/creator/submissions">My Submissions</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading campaigns...</div>
      ) : !campaigns || campaigns.length === 0 ? (
        <div className="text-muted-foreground bg-card p-8 rounded-xl border text-center">
          No active campaigns available right now. Check back later!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="line-clamp-2">{campaign.title}</CardTitle>
                <CardDescription className="capitalize">
                  {campaign.platforms?.join(', ')}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-3xl font-bold text-foreground">
                  ${(Number(campaign.payoutPer1kViews) / 100).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground font-medium">per 1,000 views</div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" asChild>
                  <Link href={`/creator/campaigns/${campaign.id}/submit`}>
                    Submit Clip
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
