import { NextRequest, NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { authenticatorDB, userDB } from '@/lib/db';
import { createSession } from '@/lib/auth';

const RP_ID = process.env.RP_ID || 'localhost';
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const challenge = request.cookies.get('webauthn-challenge')?.value;
  const userIdStr = request.cookies.get('webauthn-user-id')?.value;

  if (!challenge || !userIdStr) {
    return NextResponse.json({ error: 'Registration session expired' }, { status: 400 });
  }

  const userId = Number(userIdStr);
  const user = userDB.findById(userId);
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 400 });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credential } = verification.registrationInfo;

    authenticatorDB.create({
      user_id: userId,
      credential_id: credential.id,
      credential_public_key: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter ?? 0,
      transports: body.response?.transports ? JSON.stringify(body.response.transports) : undefined,
    });

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
