import { CampaignForm } from '@/components/CampaignForm';

export default function NewCampaignPage() {
  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create New Campaign</h1>
        <p className="text-muted-foreground mt-1">Configure a new influencer campaign and budget.</p>
      </div>
      <CampaignForm />
    </div>
  );
}
