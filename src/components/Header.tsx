import { db } from '@/db/index';
import { users } from '@/db/schema';
import { UserSwitcher } from './UserSwitcher';
import { cookies } from 'next/headers';
import { verifyUserCookie } from '@/lib/auth';

export async function Header() {
  const allUsers = await db.select().from(users);
  
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let activeUserId: string | undefined;
  
  if (token) {
    const verified = await verifyUserCookie(token);
    if (verified?.userId) {
      activeUserId = verified.userId;
    }
  }

  return (
    <header className="border-b bg-background p-4 flex items-center justify-between">
      <div className="font-bold text-xl">Wayv Agency</div>
      <UserSwitcher users={allUsers} activeUserId={activeUserId} />
    </header>
  );
}
