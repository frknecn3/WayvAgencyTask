import { SignJWT, jwtVerify } from 'jose';

const secretKey = process.env.JWT_SECRET || 'dev_secret_key_for_local_testing_only';
const key = new TextEncoder().encode(secretKey);

export async function signUserCookie(userId: string): Promise<string> {
  return await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // long-lived
    .sign(key);
}

export async function verifyUserCookie(cookie: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(cookie, key);
    return { userId: payload.userId as string };
  } catch (error) {
    return null;
  }
}
