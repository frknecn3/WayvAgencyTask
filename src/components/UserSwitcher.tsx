'use client';

import { useTransition } from 'react';
import { setUserAuthAction } from '@/app/actions/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function UserSwitcher({ users, activeUserId }: { users: { id: number; email: string; role: string }[], activeUserId?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleUserChange = (userId: string | null) => {
    if (!userId) return;
    startTransition(() => {
      setUserAuthAction(userId).then(() => {
        window.location.href = '/';
      });
    });
  };



  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Dev User:</span>
      <Select onValueChange={handleUserChange} disabled={isPending} value={activeUserId || undefined}>
        <SelectTrigger className="w-[250px]">
          <SelectValue placeholder="Select a user to login" />
        </SelectTrigger>
        <SelectContent>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id.toString()}>
              {u.email} ({u.role})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
