import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';
import { userDB, authenticatorDB } from '@/lib/db';
import { getRpID, getOrigin, getAndClearChallengeCookie } from '@/lib/webauthn';
import { createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    response?: AuthenticationResponseJSON;
  } | null;

  if (!body?.response) {
    return NextResponse.json({ error: 'Missing authentication response' }, { status: 400 });
  }

  const challengeData = await getAndClearChallengeCookie();
  if (!challengeData) {
    return NextResponse.json({ error: 'Authentication challenge expired' }, { status: 400 });
  }

  const user = userDB.findByUsername(challengeData.username);
  if (!user) {
    return NextResponse.json({ error: 'No account found for that username' }, { status: 404 });
  }

  const authenticator = authenticatorDB.findByCredentialId(body.response.id);
  if (!authenticator || authenticator.user_id !== user.id) {
    return NextResponse.json({ error: 'Passkey not recognized' }, { status: 400 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin: getOrigin(request),
      expectedRPID: getRpID(request),
      credential: {
        id: authenticator.credential_id,
        publicKey: new Uint8Array(authenticator.credential_public_key),
        counter: authenticator.counter ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Authentication verification failed' }, { status: 400 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: 'Authentication could not be verified' }, { status: 400 });
  }

  authenticatorDB.updateCounter(
    authenticator.id,
    verification.authenticationInfo.newCounter ?? 0
  );

  await createSession({ userId: user.id, username: user.username });

  return NextResponse.json({ verified: true });
}
