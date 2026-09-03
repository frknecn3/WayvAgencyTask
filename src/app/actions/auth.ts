'use server';

import { cookies } from 'next/headers';
import { signUserCookie } from '@/lib/auth';

export async function setUserAuthAction(userId: string) {
  const token = await signUserCookie(userId);
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  });
}
