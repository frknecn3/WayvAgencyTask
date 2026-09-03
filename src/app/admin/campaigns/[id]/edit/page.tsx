'use client';

import { useParams } from 'next/navigation';
import { trpc } from '@/trpc/client';
import { CampaignForm } from '@/components/CampaignForm';

export default function EditCampaignPage() {
  const params = useParams();
  const id = parseInt(params.id as string, 10);
  
  const { data, isLoading } = trpc.campaign.get.useQuery({ id }, { enabled: !!id });

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 max-w-2xl flex justify-center items-center h-48 text-muted-foreground">
        Loading campaign data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-10 max-w-2xl">
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 font-medium">
          Campaign not found.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Edit Campaign</h1>
        <p className="text-muted-foreground mt-1">Update settings for {data.title}</p>
      </div>
      <CampaignForm initialData={data} id={id} />
    </div>
  );
}
