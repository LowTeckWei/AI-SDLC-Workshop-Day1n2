import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export const RP_NAME = 'Todo App';

export function getRpID(request: NextRequest): string {
  return process.env.RP_ID ?? request.nextUrl.hostname;
}

export function getOrigin(request: NextRequest): string {
  return (
    process.env.ORIGIN ?? request.headers.get('origin') ?? request.nextUrl.origin
  );
}

const CHALLENGE_COOKIE_NAME = 'webauthn_challenge';
const CHALLENGE_MAX_AGE_SECONDS = 5 * 60; // 5 minutes

interface ChallengePayload {
  challenge: string;
  username: string;
}

export async function setChallengeCookie(payload: ChallengePayload): Promise<void> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  cookieStore.set(CHALLENGE_COOKIE_NAME, encoded, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CHALLENGE_MAX_AGE_SECONDS,
  });
}

export async function getAndClearChallengeCookie(): Promise<ChallengePayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CHALLENGE_COOKIE_NAME)?.value;
  cookieStore.delete(CHALLENGE_COOKIE_NAME);
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as ChallengePayload;
  } catch {
    return null;
  }
}
