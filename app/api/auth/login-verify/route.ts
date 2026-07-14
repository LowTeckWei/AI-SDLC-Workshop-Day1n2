import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { authenticatorDB, userDB } from '@/lib/db';
import { createSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const challenge = request.cookies.get('webauthn-challenge')?.value;
  const userIdStr = request.cookies.get('webauthn-user-id')?.value;

  if (!challenge || !userIdStr) {
    return NextResponse.json({ error: 'Login session expired' }, { status: 400 });
  }

  const userId = Number(userIdStr);
  const user = userDB.findById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 400 });
  }

  const credentialId = body.id;
  const authenticator = authenticatorDB.findByCredentialId(credentialId);
  if (!authenticator || authenticator.user_id !== userId) {
    return NextResponse.json({ error: 'Authenticator not found' }, { status: 400 });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: authenticator.credential_id,
        publicKey: Buffer.from(authenticator.credential_public_key, 'base64url'),
        counter: authenticator.counter ?? 0,
      },
    });

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    authenticatorDB.updateCounter(
      authenticator.credential_id,
      verification.authenticationInfo.newCounter ?? 0
    );

    await createSession(userId, user.username);

    const response = NextResponse.json({ verified: true });
    response.cookies.delete('webauthn-challenge');
    response.cookies.delete('webauthn-user-id');
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
