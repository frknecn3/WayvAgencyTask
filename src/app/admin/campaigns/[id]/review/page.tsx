'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/trpc/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function ReviewQueuePage() {
  const params = useParams();
  const campaignId = parseInt(params.id as string, 10);

  const utils = trpc.useUtils();
  const { data: submissions, isLoading } = trpc.submission.listPending.useQuery(
    { campaign_id: campaignId },
    { enabled: !!campaignId }
  );

  const approveMutation = trpc.submission.approve.useMutation({
    onSuccess: () => {
      toast.success('Submission approved');
      utils.submission.listPending.invalidate({ campaign_id: campaignId });
    },
    onError: (error) => toast.error(error.message)
  });

  const rejectMutation = trpc.submission.reject.useMutation({
    onSuccess: () => {
      toast.success('Submission rejected');
      utils.submission.listPending.invalidate({ campaign_id: campaignId });
      setRejectDialog({ open: false, submissionId: null, reason: '' });
    },
    onError: (error) => toast.error(error.message)
  });

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; submissionId: number | null; reason: string }>({
    open: false,
    submissionId: null,
    reason: '',
  });

  const handleApprove = (id: number) => {
    approveMutation.mutate({ id });
  };

  const submitReject = () => {
    if (rejectDialog.submissionId && rejectDialog.reason.trim()) {
      rejectMutation.mutate({ 
        submission_id: rejectDialog.submissionId, 
        reason: rejectDialog.reason 
      });
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Review Queue</h1>
        <p className="text-muted-foreground mt-1">Review pending submissions for this campaign (First Come, First Served).</p>
      </div>

      <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Creator Email</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>URL</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24">Loading pending queue...</TableCell>
              </TableRow>
            ) : !submissions || submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  The queue is empty! All caught up.
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((sub) => (
                <TableRow key={sub.id} className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">{sub.creatorEmail}</TableCell>
                  <TableCell className="capitalize">{sub.platform}</TableCell>
                  <TableCell>
                    <a href={sub.postUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {sub.postUrl.length > 30 ? sub.postUrl.substring(0, 30) + '...' : sub.postUrl}
                    </a>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(sub.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 dark:bg-green-950 dark:text-green-400"
                      size="sm"
                      onClick={() => handleApprove(sub.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setRejectDialog({ open: true, submissionId: sub.id, reason: '' })}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog 
        open={rejectDialog.open} 
        onOpenChange={(open) => !open && setRejectDialog({ open: false, submissionId: null, reason: '' })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this submission. The creator will see this.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g. Video is too short, does not mention product..." 
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog({ open: false, submissionId: null, reason: '' })}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitReject} 
              disabled={!rejectDialog.reason.trim() || rejectMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
