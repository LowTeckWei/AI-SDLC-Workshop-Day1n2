import { NextRequest, NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { generateUserID } from '@simplewebauthn/server/helpers';
import { userDB } from '@/lib/db';
import { RP_NAME, getRpID, setChallengeCookie } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  if (userDB.findByUsername(username)) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const userID = await generateUserID();
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpID(request),
    userName: username,
    userID,
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await setChallengeCookie({ challenge: options.challenge, username });

  return NextResponse.json(options);
}
