import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export const config = {
  matcher: ['/', '/calendar', '/login'],
};

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionToken(token);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = pathname === '/' || pathname === '/calendar';
  const isLoginRoute = pathname === '/login';

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (isLoginRoute && session) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}
