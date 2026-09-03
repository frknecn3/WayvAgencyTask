'use client';

import { trpc } from '@/trpc/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function MySubmissionsPage() {
  const { data: submissions, isLoading } = trpc.submission.mySubmissions.useQuery();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200">Pending</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">My Submissions</h1>
        <p className="text-muted-foreground mt-1">Track the status, views, and estimated earnings of your submitted clips.</p>
      </div>

      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Campaign</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Est. Earnings</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  Loading your submissions...
                </TableCell>
              </TableRow>
            ) : !submissions || submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  You haven't submitted any clips yet.
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => (
                <TableRow key={sub.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">{sub.campaignTitle}</TableCell>
                  <TableCell className="capitalize">{sub.platform}</TableCell>
                  <TableCell>
                    <a 
                      href={sub.postUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {sub.postUrl.length > 30 ? sub.postUrl.substring(0, 30) + '...' : sub.postUrl}
                    </a>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(sub.status)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-muted-foreground">
                    {sub.latestViews.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold text-foreground">
                    ${(sub.estimatedEarnings / 100).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
