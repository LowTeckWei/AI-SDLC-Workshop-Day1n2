import { NextRequest, NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { getRpID, setChallengeCookie } from '@/lib/webauthn';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === 'string' ? body.username.trim() : '';

  if (!username) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const user = userDB.findByUsername(username);
  if (!user) {
    return NextResponse.json({ error: 'No account found for that username' }, { status: 404 });
  }

  const authenticators = authenticatorDB.findByUserId(user.id);
  if (authenticators.length === 0) {
    return NextResponse.json({ error: 'No passkeys registered for that username' }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpID(request),
    allowCredentials: authenticators.map((authenticator) => ({
      id: authenticator.credential_id,
    })),
    userVerification: 'preferred',
  });

  await setChallengeCookie({ challenge: options.challenge, username });

  return NextResponse.json(options);
}
