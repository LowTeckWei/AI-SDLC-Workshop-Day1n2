import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

const RP_NAME = 'Todo App';
const RP_ID = process.env.RP_ID || 'localhost';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const username = (body.username ?? '').trim();

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  let user = userDB.findByUsername(username);
  if (!user) {
    user = userDB.create(username);
  }

  const existingAuthenticators = authenticatorDB.findByUserId(user.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: username,
    attestationType: 'none',
    excludeCredentials: existingAuthenticators.map((auth) => ({
      id: auth.credential_id,
      transports: auth.transports ? JSON.parse(auth.transports) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge in a cookie for verification
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
