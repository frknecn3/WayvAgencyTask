import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center p-8 text-center h-[calc(100vh-80px)]">
      <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome to Wayv Agency</h1>
      <p className="text-xl text-muted-foreground max-w-2xl mb-8">
        The ultimate platform for influencers to track their campaigns, submit clips, and maximize their payouts.
      </p>
      
      <div className="bg-muted/50 p-6 rounded-xl border border-border/50 max-w-lg">
        <h2 className="font-semibold text-lg mb-2">Getting Started</h2>
        <p className="text-sm text-muted-foreground mb-4">
          To test out the application, use the <strong>Dev User Switcher</strong> in the top right corner of the header. 
          Selecting an <strong>Admin</strong> will unlock campaign management, while selecting a <strong>Creator</strong> will give you access to submit clips!
        </p>
      </div>
    </div>
  );
}
