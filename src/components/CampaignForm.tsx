'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { campaignCreateSchema, CampaignCreateInput } from '@/lib/schemas/campaign';
import { trpc } from '@/trpc/client';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PLATFORMS = ['tiktok', 'instagram', 'youtube'] as const;

export function CampaignForm({ initialData, id }: { initialData?: any; id?: number }) {
  const router = useRouter();

  const form = useForm<CampaignCreateInput>({
    resolver: zodResolver(campaignCreateSchema),
    defaultValues: initialData ? {
      title: initialData.title,
      platforms: initialData.platforms || [],
      payout_per_1k_views: Number(initialData.payoutPer1kViews),
      total_budget: Number(initialData.totalBudget),
      status: initialData.status,
      // Map JS dates to YYYY-MM-DDThh:mm strings required by datetime-local inputs
      starts_at: new Date(initialData.startsAt).toISOString().slice(0, 16) as unknown as Date,
      ends_at: new Date(initialData.endsAt).toISOString().slice(0, 16) as unknown as Date,
    } : {
      title: '',
      platforms: [],
      payout_per_1k_views: 0,
      total_budget: 0,
      status: 'draft',
      starts_at: new Date().toISOString().slice(0, 16) as unknown as Date,
      ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) as unknown as Date,
    },
  });

  const utils = trpc.useUtils();

  const createMutation = trpc.campaign.create.useMutation({
    onSuccess: () => {
      utils.campaign.list.invalidate();
      router.push('/admin/campaigns');
    },
  });

  const updateMutation = trpc.campaign.update.useMutation({
    onSuccess: () => {
      utils.campaign.list.invalidate();
      router.push('/admin/campaigns');
    },
  });

  const onSubmit = (data: CampaignCreateInput) => {
    if (id) {
      updateMutation.mutate({ id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
      <div className="space-y-2">
        <Label>Title</Label>
        <Input {...form.register('title')} placeholder="Campaign Title" />
        {form.formState.errors.title && (
          <p className="text-sm text-red-500 font-medium">{form.formState.errors.title.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Platforms</Label>
        <div className="flex gap-4 pt-2">
          {PLATFORMS.map((platform) => (
            <div key={platform} className="flex items-center space-x-2">
              <Checkbox
                id={platform}
                checked={form.watch('platforms')?.includes(platform)}
                onCheckedChange={(checked) => {
                  const current = form.watch('platforms') || [];
                  if (checked) {
                    form.setValue('platforms', [...current, platform] as any, { shouldValidate: true });
                  } else {
                    form.setValue('platforms', current.filter((p) => p !== platform) as any, { shouldValidate: true });
                  }
                }}
              />
              <Label htmlFor={platform} className="capitalize">{platform}</Label>
            </div>
          ))}
        </div>
        {form.formState.errors.platforms && (
          <p className="text-sm text-red-500 font-medium pt-1">{form.formState.errors.platforms.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payout per 1k views (cents)</Label>
          <Input type="number" {...form.register('payout_per_1k_views', { valueAsNumber: true })} />
          {form.formState.errors.payout_per_1k_views && (
            <p className="text-sm text-red-500 font-medium">{form.formState.errors.payout_per_1k_views.message as string}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Total Budget (cents)</Label>
          <Input type="number" {...form.register('total_budget', { valueAsNumber: true })} />
          {form.formState.errors.total_budget && (
            <p className="text-sm text-red-500 font-medium">{form.formState.errors.total_budget.message as string}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select
          value={form.watch('status')}
          onValueChange={(val: any) => form.setValue('status', val, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.status && (
          <p className="text-sm text-red-500 font-medium">{form.formState.errors.status.message as string}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input type="datetime-local" {...form.register('starts_at')} />
          {form.formState.errors.starts_at && (
            <p className="text-sm text-red-500 font-medium">{form.formState.errors.starts_at.message as string}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <Input type="datetime-local" {...form.register('ends_at')} />
          {form.formState.errors.ends_at && (
            <p className="text-sm text-red-500 font-medium">{form.formState.errors.ends_at.message as string}</p>
          )}
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-foreground text-background hover:bg-foreground/90 px-5 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : id ? 'Update Campaign' : 'Create Campaign'}
        </button>
      </div>
    </form>
  );
}
