import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { cookies } from 'next/headers';
import { verifyUserCookie } from '@/lib/auth';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// context creation code runs on every trpc request
// gets auth_token from browser and finds user in db
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

// public endpoint anyone can call
export const publicProcedure = t.procedure;

// security middleware that only allows logged in users
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

// you can't request this if you are not logged in
export const protectedProcedure = t.procedure.use(isAuthed);

// only admins can enter
export const adminProcedure = protectedProcedure.use(({ next, ctx }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

// only creators can enter
export const creatorProcedure = protectedProcedure.use(({ next, ctx }) => {
  if (ctx.user.role !== 'creator') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});
