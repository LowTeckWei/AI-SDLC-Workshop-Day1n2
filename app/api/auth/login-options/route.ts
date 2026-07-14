import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

const RP_ID = process.env.RP_ID || 'localhost';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = (body.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const authenticators = authenticatorDB.findByUserId(user.id);
  if (authenticators.length === 0) {
    return NextResponse.json({ error: 'No credentials registered' }, { status: 400 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: authenticators.map((auth) => ({
      id: auth.credential_id,
      transports: auth.transports ? JSON.parse(auth.transports) : undefined,
    })),
    userVerification: 'preferred',
  });

  const response = NextResponse.json(options);
  response.cookies.set('webauthn-challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
    path: '/',
  });
  response.cookies.set('webauthn-user-id', String(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 300,
    path: '/',
  });

  return response;
}
