import { db } from '@/db/index';
import { users } from '@/db/schema';
import { UserSwitcher } from './UserSwitcher';

export async function Header() {
  const allUsers = await db.select().from(users);

  return (
    <header className="border-b bg-background p-4 flex items-center justify-between">
      <div className="font-bold text-xl">Wayv Agency</div>
      <UserSwitcher users={allUsers} />
    </header>
  );
}
