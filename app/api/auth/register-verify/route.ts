import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { getRpID, getOrigin, getAndClearChallengeCookie } from '@/lib/webauthn';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    response?: RegistrationResponseJSON;
  } | null;

  if (!body?.response) {
    return NextResponse.json({ error: 'Missing registration response' }, { status: 400 });
  }

  const challengeData = await getAndClearChallengeCookie();
  if (!challengeData) {
    return NextResponse.json({ error: 'Registration challenge expired' }, { status: 400 });
  }

  if (userDB.findByUsername(challengeData.username)) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpID(request),
    });
  } catch {
    return NextResponse.json({ error: 'Registration verification failed' }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Registration could not be verified' }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;

  const user = userDB.create(challengeData.username);
  authenticatorDB.create({
    user_id: user.id,
    credential_id: credential.id,
    credential_public_key: Buffer.from(credential.publicKey),
    counter: credential.counter ?? 0,
  });

  await createSession({ userId: user.id, username: user.username });

  return NextResponse.json({ verified: true });
}
