import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { cookies } from 'next/headers';
import { verifyUserCookie } from '@/lib/auth';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const createContext = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  type AuthUser = { id: string; email: string; role: 'admin' | 'creator' };
  let user: AuthUser | null = null;

  if (token) {
    const verified = await verifyUserCookie(token);
    if (verified?.userId) {
      const [dbUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(verified.userId, 10)))
        .limit(1);

      if (dbUser) {
        user = {
          id: dbUser.id.toString(),
          email: dbUser.email,
          role: dbUser.role as 'admin' | 'creator',
        };
      }
    }
  }

  return {
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

export const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
