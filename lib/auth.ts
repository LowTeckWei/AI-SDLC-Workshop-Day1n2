import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { Session } from '@/lib/db';

export const SESSION_COOKIE_NAME = 'todo_session';
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  return secret;
}

/** Pure token verification, usable from middleware (via request.cookies) or route handlers. */
export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getJwtSecret()) as Session;
    return { userId: payload.userId, username: payload.username };
  } catch {
    return null;
  }
}

export async function createSession(session: Session): Promise<void> {
  const token = jwt.sign(session, getJwtSecret(), {
    expiresIn: SESSION_MAX_AGE_SECONDS,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
