'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/trpc/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const rejectSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
});
type RejectInput = z.infer<typeof rejectSchema>;

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
      closeRejectDialog();
    },
    onError: (error) => toast.error(error.message)
  });

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; submissionId: number | null }>({
    open: false,
    submissionId: null,
  });

  const form = useForm<RejectInput>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      reason: '',
    },
  });

  const closeRejectDialog = () => {
    setRejectDialog({ open: false, submissionId: null });
    form.reset({ reason: '' });
  };

  const openRejectDialog = (id: number) => {
    setRejectDialog({ open: true, submissionId: id });
    form.reset({ reason: '' });
  };

  const handleApprove = (id: number) => {
    approveMutation.mutate({ submission_id: id, campaign_id: campaignId });
  };

  const onSubmitReject = (data: RejectInput) => {
    if (rejectDialog.submissionId) {
      rejectMutation.mutate({ 
        submission_id: rejectDialog.submissionId, 
        reason: data.reason 
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
                      onClick={() => openRejectDialog(sub.id)}
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
        onOpenChange={(open) => !open && closeRejectDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this submission. The creator will see this.
            </DialogDescription>
          </DialogHeader>
          <form id="reject-form" onSubmit={form.handleSubmit(onSubmitReject)} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea 
                placeholder="e.g. Video is too short, does not mention product..." 
                {...form.register('reason')}
                className={form.formState.errors.reason ? "border-destructive focus-visible:ring-destructive" : ""}
                rows={4}
              />
              {form.formState.errors.reason && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.reason.message}
                </p>
              )}
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={closeRejectDialog}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              type="submit"
              form="reject-form"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
