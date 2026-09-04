'use client';

import { trpc } from '@/trpc/client';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, DollarSign, Wallet, Activity } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function AdminCampaignDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const { data: campaign, isLoading: isCampaignLoading } = trpc.campaign.get.useQuery({ id }, {
    enabled: !!id,
  });
  
  const { data: stats, isLoading: isStatsLoading } = trpc.campaign.stats.useQuery({ campaign_id: id }, {
    enabled: !!id,
  });

  const { data: dailyViews, isLoading: isDailyViewsLoading } = trpc.campaign.dailyViews.useQuery({ campaign_id: id }, {
    enabled: !!id,
  });

  if (isCampaignLoading || isStatsLoading) {
    return (
      <div className="container mx-auto py-10 max-w-6xl animate-pulse space-y-6">
        <div className="h-10 w-1/3 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-muted rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  if (!campaign || !stats) {
    return (
      <div className="container mx-auto py-10 max-w-6xl">
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 font-medium">
          Campaign not found or an error occurred loading stats.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{campaign.title}</h1>
          <p className="text-muted-foreground mt-1 capitalize">
            Platforms: {campaign.platforms?.join(', ')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/campaigns/${campaign.id}/review`} className={buttonVariants({ variant: 'outline' })}>
            Review Queue
          </Link>
          <Link href={`/admin/campaigns/${campaign.id}/edit`} className={buttonVariants({ variant: 'default' })}>
            Edit Campaign
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApprovedViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">From approved submissions</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.budgetSpent / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total payouts accumulated</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Left</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.budgetLeft / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Remaining allocation</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {campaign.status}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ends on {new Date(campaign.endsAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle>Daily Views</CardTitle>
          <CardDescription>Performance of approved submissions over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isDailyViewsLoading ? (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground animate-pulse bg-muted/20 rounded-lg">
              Loading chart data...
            </div>
          ) : !dailyViews || dailyViews.length === 0 || dailyViews.every(d => d.views === 0) ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
              <Activity className="h-8 w-8 mb-2 opacity-50" />
              <p>No performance data available yet.</p>
              <p className="text-xs mt-1">Metrics will appear here once approved submissions gather views.</p>
            </div>
          ) : (
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyViews} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    dx={-10}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    formatter={(value: number) => [value.toLocaleString(), 'Views']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="views" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorViews)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
