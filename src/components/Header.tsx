import { db } from '@/db/index';
import { users } from '@/db/schema';
import { UserSwitcher } from './UserSwitcher';
import { cookies } from 'next/headers';
import { verifyUserCookie } from '@/lib/auth';
import Link from 'next/link';

export async function Header() {
  const allUsers = await db.select().from(users);
  
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let activeUserId: string | undefined;
  let activeUserRole: string | undefined;
  
  if (token) {
    const verified = await verifyUserCookie(token);
    if (verified?.userId) {
      activeUserId = verified.userId;
      const user = allUsers.find((u) => u.id.toString() === activeUserId);
      if (user) {
        activeUserRole = user.role;
      }
    }
  }

  return (
    <header className="border-b bg-background p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 w-full md:w-auto">
        <Link href="/" className="font-bold text-xl hover:opacity-80 transition-opacity">
          Wayv Agency
        </Link>
        <nav className="flex flex-wrap items-center gap-4 md:gap-6 text-sm font-medium">
          {activeUserRole === 'admin' && (
            <>
              <Link href="/admin/campaigns" className="text-muted-foreground hover:text-foreground transition-colors">Manage Campaigns</Link>
              <Link href="/admin/campaigns/new" className="text-muted-foreground hover:text-foreground transition-colors">Create Campaign</Link>
            </>
          )}
          {activeUserRole === 'creator' && (
            <>
              <Link href="/creator" className="text-muted-foreground hover:text-foreground transition-colors">Browse Campaigns</Link>
              <Link href="/creator/submissions" className="text-muted-foreground hover:text-foreground transition-colors">My Submissions</Link>
            </>
          )}
          {!activeUserRole && (
            <span className="text-muted-foreground text-xs italic">Select a user to view navigation</span>
          )}
        </nav>
      </div>
      <UserSwitcher users={allUsers} activeUserId={activeUserId} />
    </header>
  );
}
