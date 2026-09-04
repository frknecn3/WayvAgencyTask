'use client';

import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submissionCreateSchema, SubmissionCreateInput } from '@/lib/schemas/submission';
import { trpc } from '@/trpc/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SubmitClipPage() {
  const params = useParams();
  const campaignId = parseInt(params.id as string, 10);
  const router = useRouter();
  
  const { data: campaign, isLoading } = trpc.campaign.getForCreator.useQuery(
    { id: campaignId }, 
    { enabled: !!campaignId }
  );
  
  const form = useForm<any>({
    resolver: zodResolver(submissionCreateSchema),
    defaultValues: {
      campaign_id: campaignId,
      post_url: '',
      platform: undefined as any, // user must select
    },
  });

  const createMutation = trpc.submission.create.useMutation({
    onSuccess: () => {
      toast.success('Clip submitted successfully!');
      router.push('/creator/submissions');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to submit clip');
    }
  });

  const onSubmit = (data: any) => {
    createMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="container mx-auto py-10 max-w-xl text-muted-foreground text-center">Loading campaign details...</div>;
  }

  if (!campaign) {
    return (
      <div className="container mx-auto py-10 max-w-xl text-center">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg font-medium border border-destructive/20">
          Campaign not found or is no longer active.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-xl">
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Submit Clip</CardTitle>
          <CardDescription>
            Submit your content for <strong className="text-foreground">{campaign.title}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="submit-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={form.watch('platform')}
                onValueChange={(val: any) => form.setValue('platform', val, { shouldValidate: true })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {campaign.platforms?.map((platform) => (
                    <SelectItem key={platform} value={platform} className="capitalize">
                      {platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.platform && (
                <p className="text-sm text-red-500 font-medium">{form.formState.errors.platform.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Post URL</Label>
              <Input {...form.register('post_url')} placeholder="e.g. https://tiktok.com/@user/video/123" />
              {form.formState.errors.post_url && (
                <p className="text-sm text-red-500 font-medium">{form.formState.errors.post_url.message as string}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Paste the direct link to your published clip. Make sure the URL format matches the platform.
              </p>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 border-t bg-muted/20 p-4">
          <Button variant="outline" onClick={() => router.back()} type="button">
            Cancel
          </Button>
          <Button 
            type="submit" 
            form="submit-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Submitting...' : 'Submit Clip'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
